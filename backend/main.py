import re
import unicodedata

from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db, SessionLocal
import models


# ==================================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ==================================================

app = FastAPI(
    title="Sistema de Barbearia",
    version="1.0.0",
)

SECRET_KEY = "troque-essa-chave-por-uma-chave-segura"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)

security = HTTPBearer()

Base.metadata.create_all(bind=engine)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# SCHEMAS DE AUTENTICAÇÃO
# ==================================================

class AdminRegister(BaseModel):
    adminName: str = Field(min_length=2, max_length=100)
    barbershopName: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=6, max_length=128)


class AdminLogin(BaseModel):
    email: str
    password: str


# ==================================================
# SCHEMAS DE SERVIÇOS
# ==================================================

class ServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    price: float = Field(gt=0)
    description: str = Field(min_length=2, max_length=500)


class ServiceUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    price: float = Field(gt=0)
    description: str = Field(min_length=2, max_length=500)


# ==================================================
# SCHEMAS DE AGENDAMENTOS
# ==================================================

class AppointmentCreate(BaseModel):
    clientName: str = Field(min_length=2, max_length=150)
    serviceId: int
    professionalId: int
    date: str
    time: str


class AppointmentStatusUpdate(BaseModel):
    status: Literal["pending", "completed", "canceled"]


# ==================================================
# FORMATADORES
# ==================================================

def format_barbershop(barbershop: models.Barbershop):
    return {
        "id": barbershop.id,
        "name": barbershop.name,
        "slug": barbershop.slug,
    }


def format_service(service: models.Service):
    return {
        "id": service.id,
        "barbershopId": service.barbershop_id,
        "name": service.name,
        "price": service.price,
        "description": service.description,
    }


def format_professional(professional: models.Professional):
    return {
        "id": professional.id,
        "barbershopId": professional.barbershop_id,
        "name": professional.name,
        "specialty": professional.specialty,
    }


def format_appointment(appointment: models.Appointment):
    return {
        "id": appointment.id,
        "barbershopId": appointment.barbershop_id,
        "clientName": appointment.client_name,
        "serviceName": appointment.service_name,
        "professionalName": appointment.professional_name,
        "professionalSpecialty": appointment.professional_specialty,
        "date": appointment.date,
        "time": appointment.time,
        "price": appointment.price,
        "status": appointment.status,
    }


# ==================================================
# FUNÇÕES DE BARBEARIA
# ==================================================

def get_barbershop_by_slug(
    db: Session,
    slug: str,
):
    barbershop = (
        db.query(models.Barbershop)
        .filter(models.Barbershop.slug == slug)
        .first()
    )

    if not barbershop:
        raise HTTPException(
            status_code=404,
            detail="Barbearia não encontrada",
        )

    return barbershop


def create_slug(value: str):
    normalized_value = unicodedata.normalize(
        "NFKD",
        value,
    )

    value_without_accents = normalized_value.encode(
        "ascii",
        "ignore",
    ).decode("ascii")

    slug = re.sub(
        r"[^a-z0-9]+",
        "-",
        value_without_accents.lower(),
    ).strip("-")

    if not slug:
        slug = f"barbearia-{uuid4().hex[:8]}"

    return slug


def create_unique_barbershop_slug(
    db: Session,
    barbershop_name: str,
):
    base_slug = create_slug(barbershop_name)

    slug = base_slug
    suffix = 2

    while (
        db.query(models.Barbershop)
        .filter(models.Barbershop.slug == slug)
        .first()
    ):
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    return slug


# ==================================================
# FUNÇÕES DE AUTENTICAÇÃO
# ==================================================

def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(
    password: str,
    password_hash: str,
):
    return pwd_context.verify(
        password,
        password_hash,
    )


def create_access_token(data: dict):
    token_data = data.copy()

    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    token_data.update({
        "exp": expiration,
    })

    return jwt.encode(
        token_data,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    authentication_error = HTTPException(
        status_code=401,
        detail="Token inválido ou expirado",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        admin_id = payload.get("sub")

        if not admin_id:
            raise authentication_error

    except JWTError:
        raise authentication_error

    admin = (
        db.query(models.Admin)
        .filter(models.Admin.id == admin_id)
        .first()
    )

    if not admin:
        raise authentication_error

    return admin


# ==================================================
# DADOS INICIAIS PARA TESTE
# ==================================================

def seed_initial_data():
    db = SessionLocal()

    try:
        toid = (
            db.query(models.Barbershop)
            .filter(models.Barbershop.slug == "toid")
            .first()
        )

        if not toid:
            toid = models.Barbershop(
                id="barbearia-001",
                name="TOID Barbearia",
                slug="toid",
            )

            db.add(toid)
            db.commit()
            db.refresh(toid)

        corte_fino = (
            db.query(models.Barbershop)
            .filter(models.Barbershop.slug == "corte-fino")
            .first()
        )

        if not corte_fino:
            corte_fino = models.Barbershop(
                id="barbearia-002",
                name="Barbearia Corte Fino",
                slug="corte-fino",
            )

            db.add(corte_fino)
            db.commit()

        services_count = (
            db.query(models.Service)
            .filter(
                models.Service.barbershop_id == "barbearia-001"
            )
            .count()
        )

        if services_count == 0:
            services = [
                models.Service(
                    barbershop_id="barbearia-001",
                    name="Corte Masculino",
                    price=35,
                    description=(
                        "Corte moderno com acabamento profissional."
                    ),
                ),
                models.Service(
                    barbershop_id="barbearia-001",
                    name="Barba",
                    price=20,
                    description=(
                        "Modelagem e acabamento da barba."
                    ),
                ),
                models.Service(
                    barbershop_id="barbearia-001",
                    name="Corte + Barba",
                    price=50,
                    description=(
                        "Pacote completo para renovar o visual."
                    ),
                ),
            ]

            db.add_all(services)
            db.commit()

        professionals_count = (
            db.query(models.Professional)
            .filter(
                models.Professional.barbershop_id
                == "barbearia-001"
            )
            .count()
        )

        if professionals_count == 0:
            professionals = [
                models.Professional(
                    barbershop_id="barbearia-001",
                    name="Carlos Andrade",
                    specialty="Corte Masculino",
                ),
                models.Professional(
                    barbershop_id="barbearia-001",
                    name="Rafael Souza",
                    specialty="Barba e Acabamento",
                ),
                models.Professional(
                    barbershop_id="barbearia-001",
                    name="Lucas Martins",
                    specialty="Sobrancelha",
                ),
            ]

            db.add_all(professionals)
            db.commit()

    finally:
        db.close()


seed_initial_data()


# ==================================================
# ROTA INICIAL
# ==================================================

@app.get("/")
def home():
    return {
        "message": (
            "API da Barbearia funcionando com banco de dados"
        )
    }


# ==================================================
# AUTENTICAÇÃO
# ==================================================

@app.post("/auth/register", status_code=201)
def register_admin(
    register_data: AdminRegister,
    db: Session = Depends(get_db),
):
    normalized_email = (
        register_data.email
        .strip()
        .lower()
    )

    existing_admin = (
        db.query(models.Admin)
        .filter(models.Admin.email == normalized_email)
        .first()
    )

    if existing_admin:
        raise HTTPException(
            status_code=400,
            detail=(
                "Já existe uma conta cadastrada com esse e-mail"
            ),
        )

    barbershop_slug = create_unique_barbershop_slug(
        db,
        register_data.barbershopName,
    )

    barbershop_id = str(uuid4())
    admin_id = str(uuid4())

    new_barbershop = models.Barbershop(
        id=barbershop_id,
        name=register_data.barbershopName.strip(),
        slug=barbershop_slug,
    )

    new_admin = models.Admin(
        id=admin_id,
        name=register_data.adminName.strip(),
        email=normalized_email,
        password_hash=hash_password(
            register_data.password
        ),
        barbershop_id=barbershop_id,
    )

    try:
        db.add_all([
            new_barbershop,
            new_admin,
        ])

        db.commit()

        db.refresh(new_barbershop)
        db.refresh(new_admin)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Não foi possível concluir o cadastro",
        )

    access_token = create_access_token(
        {
            "sub": new_admin.id,
            "barbershopId": new_barbershop.id,
            "barbershopSlug": new_barbershop.slug,
        }
    )

    return {
        "accessToken": access_token,
        "admin": {
            "id": new_admin.id,
            "name": new_admin.name,
            "email": new_admin.email,
            "barbershopId": new_barbershop.id,
            "barbershopSlug": new_barbershop.slug,
        },
        "barbershop": {
            "id": new_barbershop.id,
            "name": new_barbershop.name,
            "slug": new_barbershop.slug,
        },
    }


@app.post("/auth/login")
def login_admin(
    admin_data: AdminLogin,
    db: Session = Depends(get_db),
):
    normalized_email = (
        admin_data.email
        .strip()
        .lower()
    )

    found_admin = (
        db.query(models.Admin)
        .filter(models.Admin.email == normalized_email)
        .first()
    )

    if not found_admin:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos",
        )

    password_is_valid = verify_password(
        admin_data.password,
        found_admin.password_hash,
    )

    if not password_is_valid:
        raise HTTPException(
            status_code=401,
            detail="E-mail ou senha inválidos",
        )

    barbershop = (
        db.query(models.Barbershop)
        .filter(
            models.Barbershop.id
            == found_admin.barbershop_id
        )
        .first()
    )

    if not barbershop:
        raise HTTPException(
            status_code=500,
            detail=(
                "A barbearia vinculada à conta não foi encontrada"
            ),
        )

    access_token = create_access_token(
        {
            "sub": found_admin.id,
            "barbershopId": barbershop.id,
            "barbershopSlug": barbershop.slug,
        }
    )

    return {
        "accessToken": access_token,
        "admin": {
            "id": found_admin.id,
            "name": found_admin.name,
            "email": found_admin.email,
            "barbershopId": barbershop.id,
            "barbershopSlug": barbershop.slug,
        },
        "barbershop": {
            "id": barbershop.id,
            "name": barbershop.name,
            "slug": barbershop.slug,
        },
    }


# ==================================================
# ROTAS PÚBLICAS DA BARBEARIA
# ==================================================

@app.get("/barbershops/{slug}")
def get_barbershop(
    slug: str,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    return format_barbershop(barbershop)


@app.get("/barbershops/{slug}/services")
def get_barbershop_services(
    slug: str,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    services = (
        db.query(models.Service)
        .filter(
            models.Service.barbershop_id
            == barbershop.id
        )
        .order_by(models.Service.name)
        .all()
    )

    return [
        format_service(service)
        for service in services
    ]


@app.get("/barbershops/{slug}/professionals")
def get_barbershop_professionals(
    slug: str,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    professionals = (
        db.query(models.Professional)
        .filter(
            models.Professional.barbershop_id
            == barbershop.id
        )
        .order_by(models.Professional.name)
        .all()
    )

    return [
        format_professional(professional)
        for professional in professionals
    ]


@app.get("/barbershops/{slug}/appointments")
def get_barbershop_appointments(
    slug: str,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    appointments = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.barbershop_id
            == barbershop.id
        )
        .order_by(
            models.Appointment.date,
            models.Appointment.time,
        )
        .all()
    )

    return [
        format_appointment(appointment)
        for appointment in appointments
    ]


@app.post(
    "/barbershops/{slug}/appointments",
    status_code=201,
)
def create_barbershop_appointment(
    slug: str,
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    selected_service = (
        db.query(models.Service)
        .filter(
            models.Service.id
            == appointment_data.serviceId,
            models.Service.barbershop_id
            == barbershop.id,
        )
        .first()
    )

    selected_professional = (
        db.query(models.Professional)
        .filter(
            models.Professional.id
            == appointment_data.professionalId,
            models.Professional.barbershop_id
            == barbershop.id,
        )
        .first()
    )

    if not selected_service:
        raise HTTPException(
            status_code=404,
            detail=(
                "Serviço não encontrado nessa barbearia"
            ),
        )

    if not selected_professional:
        raise HTTPException(
            status_code=404,
            detail=(
                "Profissional não encontrado nessa barbearia"
            ),
        )

    new_appointment = models.Appointment(
        id=str(uuid4()),
        barbershop_id=barbershop.id,
        client_name=appointment_data.clientName.strip(),
        service_name=selected_service.name,
        professional_name=selected_professional.name,
        professional_specialty=(
            selected_professional.specialty
        ),
        date=appointment_data.date,
        time=appointment_data.time,
        price=selected_service.price,
        status="pending",
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    return format_appointment(new_appointment)


@app.patch(
    "/barbershops/{slug}/appointments/"
    "{appointment_id}/status"
)
def update_barbershop_appointment_status(
    slug: str,
    appointment_id: str,
    status_data: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    appointment = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.id
            == appointment_id,
            models.Appointment.barbershop_id
            == barbershop.id,
        )
        .first()
    )

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado",
        )

    appointment.status = status_data.status

    db.commit()
    db.refresh(appointment)

    return format_appointment(appointment)


# ==================================================
# ADMIN — PERFIL
# ==================================================

@app.get("/admin/me")
def get_admin_profile(
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    barbershop = (
        db.query(models.Barbershop)
        .filter(
            models.Barbershop.id
            == current_admin.barbershop_id
        )
        .first()
    )

    return {
        "admin": {
            "id": current_admin.id,
            "name": current_admin.name,
            "email": current_admin.email,
            "barbershopId": current_admin.barbershop_id,
        },
        "barbershop": (
            format_barbershop(barbershop)
            if barbershop
            else None
        ),
    }


# ==================================================
# ADMIN — SERVIÇOS
# ==================================================

@app.get("/admin/services")
def get_admin_services(
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    services = (
        db.query(models.Service)
        .filter(
            models.Service.barbershop_id
            == current_admin.barbershop_id
        )
        .order_by(models.Service.name)
        .all()
    )

    return [
        format_service(service)
        for service in services
    ]


@app.post("/admin/services", status_code=201)
def create_admin_service(
    service_data: ServiceCreate,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    new_service = models.Service(
        barbershop_id=current_admin.barbershop_id,
        name=service_data.name.strip(),
        price=service_data.price,
        description=service_data.description.strip(),
    )

    db.add(new_service)
    db.commit()
    db.refresh(new_service)

    return format_service(new_service)


@app.put("/admin/services/{service_id}")
def update_admin_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    service = (
        db.query(models.Service)
        .filter(
            models.Service.id == service_id,
            models.Service.barbershop_id
            == current_admin.barbershop_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Serviço não encontrado",
        )

    service.name = service_data.name.strip()
    service.price = service_data.price
    service.description = (
        service_data.description.strip()
    )

    db.commit()
    db.refresh(service)

    return format_service(service)


@app.delete("/admin/services/{service_id}")
def delete_admin_service(
    service_id: int,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    service = (
        db.query(models.Service)
        .filter(
            models.Service.id == service_id,
            models.Service.barbershop_id
            == current_admin.barbershop_id,
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Serviço não encontrado",
        )

    db.delete(service)
    db.commit()

    return {
        "message": "Serviço excluído com sucesso"
    }