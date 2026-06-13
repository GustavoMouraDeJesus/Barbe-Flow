import re
import unicodedata

from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
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


UPLOADS_DIR = Path("uploads/gallery")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads",
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
# SCHEMAS DE APARÊNCIA DA BARBEARIA
# ==================================================

class BarbershopAppearanceUpdate(BaseModel):
    primaryColor: str = Field(min_length=4, max_length=20)
    secondaryColor: str = Field(min_length=4, max_length=20)
    welcomeText: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=2, max_length=300)
    instagram: str | None = Field(default=None, max_length=255)
    whatsapp: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=255)


# ==================================================
# SCHEMAS DE SERVIÇOS
# ==================================================

class ServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    price: float = Field(gt=0)
    description: str = Field(min_length=2, max_length=500)
    durationMinutes: int = Field(default=30, ge=5, le=480)


class ServiceUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    price: float = Field(gt=0)
    description: str = Field(min_length=2, max_length=500)
    durationMinutes: int = Field(default=30, ge=5, le=480)


# ==================================================
# SCHEMAS DE PROFISSIONAIS / FUNCIONÁRIOS
# ==================================================

class ProfessionalCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    specialty: str = Field(min_length=2, max_length=100)


class ProfessionalUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    specialty: str = Field(min_length=2, max_length=100)


# ==================================================
# SCHEMAS DE FUNCIONAMENTO
# ==================================================

class BusinessHourUpdate(BaseModel):
    weekday: int = Field(ge=0, le=6)
    isOpen: bool
    openTime: str
    closeTime: str


class BusinessHoursUpdate(BaseModel):
    businessHours: list[BusinessHourUpdate]


# ==================================================
# SCHEMAS DE AGENDAMENTOS
# ==================================================

class AppointmentCreate(BaseModel):
    clientName: str = Field(min_length=2, max_length=150)
    clientPhone: str = Field(min_length=8, max_length=20)
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
        "primaryColor": barbershop.primary_color,
        "secondaryColor": barbershop.secondary_color,
        "welcomeText": barbershop.welcome_text,
        "description": barbershop.description,
        "instagram": barbershop.instagram,
        "whatsapp": barbershop.whatsapp,
        "address": barbershop.address,
    }



def format_gallery_image(image: models.GalleryImage):
    return {
        "id": image.id,
        "barbershopId": image.barbershop_id,
        "imageUrl": image.image_url,
        "originalFilename": image.original_filename,
        "createdAt": image.created_at,
    }


def format_service(service: models.Service):
    return {
        "id": service.id,
        "barbershopId": service.barbershop_id,
        "name": service.name,
        "price": service.price,
        "description": service.description,
        "durationMinutes": service.duration_minutes,
    }


def format_professional(professional: models.Professional):
    return {
        "id": professional.id,
        "barbershopId": professional.barbershop_id,
        "name": professional.name,
        "specialty": professional.specialty,
    }


def format_business_hour(business_hour: models.BusinessHour):
    return {
        "id": business_hour.id,
        "barbershopId": business_hour.barbershop_id,
        "weekday": business_hour.weekday,
        "isOpen": business_hour.is_open,
        "openTime": business_hour.open_time,
        "closeTime": business_hour.close_time,
    }


def format_appointment(appointment: models.Appointment):
    return {
        "id": appointment.id,
        "barbershopId": appointment.barbershop_id,
        "clientName": appointment.client_name,
        "clientPhone": appointment.client_phone,
        "serviceId": appointment.service_id,
        "serviceName": appointment.service_name,
        "serviceDurationMinutes": appointment.service_duration_minutes,
        "professionalId": appointment.professional_id,
        "professionalName": appointment.professional_name,
        "professionalSpecialty": appointment.professional_specialty,
        "date": appointment.date,
        "time": appointment.time,
        "price": appointment.price,
        "status": appointment.status,
    }


# ==================================================
# FUNÇÕES DE VALIDAÇÃO
# ==================================================

def parse_date(date_value: str):
    try:
        return datetime.strptime(date_value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Data inválida. Use o formato YYYY-MM-DD.",
        )


def parse_time(time_value: str):
    try:
        return datetime.strptime(time_value, "%H:%M").time()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Horário inválido. Use o formato HH:MM.",
        )


def time_to_minutes(time_value: str):
    parsed_time = parse_time(time_value)
    return parsed_time.hour * 60 + parsed_time.minute


def minutes_to_time(minutes: int):
    hours = minutes // 60
    remaining_minutes = minutes % 60
    return f"{hours:02d}:{remaining_minutes:02d}"


def validate_business_hour_time(
    open_time: str,
    close_time: str,
    is_open: bool,
):
    parsed_open_time = time_to_minutes(open_time)
    parsed_close_time = time_to_minutes(close_time)

    if is_open and parsed_open_time >= parsed_close_time:
        raise HTTPException(
            status_code=400,
            detail="O horário de abertura deve ser menor que o horário de fechamento.",
        )


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
# FUNÇÕES DE FUNCIONAMENTO / DISPONIBILIDADE
# ==================================================

def create_default_business_hours(
    db: Session,
    barbershop_id: str,
):
    existing_count = (
        db.query(models.BusinessHour)
        .filter(models.BusinessHour.barbershop_id == barbershop_id)
        .count()
    )

    if existing_count > 0:
        return

    default_business_hours = [
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=0,
            is_open=True,
            open_time="09:00",
            close_time="18:00",
        ),
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=1,
            is_open=True,
            open_time="09:00",
            close_time="18:00",
        ),
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=2,
            is_open=True,
            open_time="09:00",
            close_time="18:00",
        ),
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=3,
            is_open=True,
            open_time="09:00",
            close_time="18:00",
        ),
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=4,
            is_open=True,
            open_time="09:00",
            close_time="18:00",
        ),
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=5,
            is_open=True,
            open_time="08:00",
            close_time="14:00",
        ),
        models.BusinessHour(
            barbershop_id=barbershop_id,
            weekday=6,
            is_open=False,
            open_time="09:00",
            close_time="18:00",
        ),
    ]

    db.add_all(default_business_hours)


def ensure_business_hours_exist(
    db: Session,
    barbershop_id: str,
):
    existing_count = (
        db.query(models.BusinessHour)
        .filter(models.BusinessHour.barbershop_id == barbershop_id)
        .count()
    )

    if existing_count == 0:
        create_default_business_hours(db, barbershop_id)
        db.commit()


def get_business_hour_for_date(
    db: Session,
    barbershop_id: str,
    appointment_date: str,
):
    parsed_date = parse_date(appointment_date)
    weekday = parsed_date.weekday()

    ensure_business_hours_exist(db, barbershop_id)

    business_hour = (
        db.query(models.BusinessHour)
        .filter(
            models.BusinessHour.barbershop_id == barbershop_id,
            models.BusinessHour.weekday == weekday,
        )
        .first()
    )

    if not business_hour:
        raise HTTPException(
            status_code=400,
            detail="Horário de funcionamento não configurado para esse dia.",
        )

    return business_hour


def has_time_conflict(
    new_start: int,
    new_end: int,
    existing_start: int,
    existing_end: int,
):
    return new_start < existing_end and new_end > existing_start


def validate_appointment_inside_business_hours(
    db: Session,
    barbershop_id: str,
    appointment_date: str,
    appointment_time: str,
    duration_minutes: int,
):
    business_hour = get_business_hour_for_date(
        db=db,
        barbershop_id=barbershop_id,
        appointment_date=appointment_date,
    )

    if not business_hour.is_open:
        raise HTTPException(
            status_code=400,
            detail="A barbearia está fechada nesse dia.",
        )

    appointment_start = time_to_minutes(appointment_time)
    appointment_end = appointment_start + duration_minutes

    open_time = time_to_minutes(business_hour.open_time)
    close_time = time_to_minutes(business_hour.close_time)

    if appointment_start < open_time or appointment_end > close_time:
        raise HTTPException(
            status_code=400,
            detail=(
                "Horário fora do funcionamento da barbearia. "
                f"Funcionamento nesse dia: {business_hour.open_time} às {business_hour.close_time}. "
                f"Esse serviço dura {duration_minutes} minutos."
            ),
        )


def validate_professional_availability(
    db: Session,
    barbershop_id: str,
    professional_id: int,
    appointment_date: str,
    appointment_time: str,
    duration_minutes: int,
    ignored_appointment_id: Optional[str] = None,
):
    new_start = time_to_minutes(appointment_time)
    new_end = new_start + duration_minutes

    query = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.barbershop_id == barbershop_id,
            models.Appointment.professional_id == professional_id,
            models.Appointment.date == appointment_date,
            models.Appointment.status != "canceled",
        )
    )

    if ignored_appointment_id:
        query = query.filter(
            models.Appointment.id != ignored_appointment_id
        )

    existing_appointments = query.all()

    for existing_appointment in existing_appointments:
        existing_start = time_to_minutes(existing_appointment.time)
        existing_duration = existing_appointment.service_duration_minutes or 30
        existing_end = existing_start + existing_duration

        if has_time_conflict(
            new_start=new_start,
            new_end=new_end,
            existing_start=existing_start,
            existing_end=existing_end,
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Esse profissional já possui um agendamento "
                    f"das {existing_appointment.time} às {minutes_to_time(existing_end)}. "
                    "Escolha outro horário ou outro profissional."
                ),
            )


def get_available_times_for_professional(
    db: Session,
    barbershop_id: str,
    professional_id: int,
    appointment_date: str,
    duration_minutes: int,
):
    business_hour = get_business_hour_for_date(
        db=db,
        barbershop_id=barbershop_id,
        appointment_date=appointment_date,
    )

    if not business_hour.is_open:
        return []

    open_time = time_to_minutes(business_hour.open_time)
    close_time = time_to_minutes(business_hour.close_time)

    existing_appointments = (
        db.query(models.Appointment)
        .filter(
            models.Appointment.barbershop_id == barbershop_id,
            models.Appointment.professional_id == professional_id,
            models.Appointment.date == appointment_date,
            models.Appointment.status != "canceled",
        )
        .all()
    )

    available_times = []

    # Intervalo entre opções de horário.
    # Exemplo: 09:00, 09:10, 09:20...
    step_minutes = 10

    current_time = open_time

    while current_time + duration_minutes <= close_time:
        current_start = current_time
        current_end = current_start + duration_minutes

        has_conflict_with_existing = False

        for existing_appointment in existing_appointments:
            existing_start = time_to_minutes(existing_appointment.time)
            existing_duration = existing_appointment.service_duration_minutes or 30
            existing_end = existing_start + existing_duration

            if has_time_conflict(
                new_start=current_start,
                new_end=current_end,
                existing_start=existing_start,
                existing_end=existing_end,
            ):
                has_conflict_with_existing = True
                break

        if not has_conflict_with_existing:
            available_times.append(minutes_to_time(current_start))

        current_time += step_minutes

    return available_times


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
                primary_color="#ffffff",
                secondary_color="#000000",
                welcome_text="Agende seu horário na TOID Barbearia",
                description="Escolha seu serviço, profissional e horário disponível.",
                instagram="@toidbarbearia",
                whatsapp="11999999999",
                address="São Paulo - SP",
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
                primary_color="#facc15",
                secondary_color="#111111",
                welcome_text="Agende seu horário na Barbearia Corte Fino",
                description="Atendimento profissional com praticidade.",
                instagram="@cortefino",
                whatsapp="11999999999",
                address="São Paulo - SP",
            )

            db.add(corte_fino)
            db.commit()
            db.refresh(corte_fino)

        ensure_business_hours_exist(db, toid.id)
        ensure_business_hours_exist(db, corte_fino.id)

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
                    duration_minutes=40,
                ),
                models.Service(
                    barbershop_id="barbearia-001",
                    name="Barba",
                    price=20,
                    description=(
                        "Modelagem e acabamento da barba."
                    ),
                    duration_minutes=30,
                ),
                models.Service(
                    barbershop_id="barbearia-001",
                    name="Sobrancelha",
                    price=15,
                    description=(
                        "Design e acabamento de sobrancelha."
                    ),
                    duration_minutes=20,
                ),
                models.Service(
                    barbershop_id="barbearia-001",
                    name="Corte + Barba",
                    price=50,
                    description=(
                        "Pacote completo para renovar o visual."
                    ),
                    duration_minutes=60,
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

        create_default_business_hours(db, barbershop_id)

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



@app.get("/barbershops/{slug}/gallery")
def get_barbershop_gallery(
    slug: str,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    images = (
        db.query(models.GalleryImage)
        .filter(
            models.GalleryImage.barbershop_id
            == barbershop.id
        )
        .order_by(models.GalleryImage.id.desc())
        .all()
    )

    return [format_gallery_image(image) for image in images]


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


@app.get("/barbershops/{slug}/business-hours")
def get_public_business_hours(
    slug: str,
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    ensure_business_hours_exist(db, barbershop.id)

    business_hours = (
        db.query(models.BusinessHour)
        .filter(
            models.BusinessHour.barbershop_id
            == barbershop.id
        )
        .order_by(models.BusinessHour.weekday)
        .all()
    )

    return [
        format_business_hour(business_hour)
        for business_hour in business_hours
    ]


@app.get("/barbershops/{slug}/available-times")
def get_barbershop_available_times(
    slug: str,
    serviceId: int = Query(...),
    professionalId: int = Query(...),
    date: str = Query(...),
    db: Session = Depends(get_db),
):
    barbershop = get_barbershop_by_slug(
        db,
        slug,
    )

    selected_service = (
        db.query(models.Service)
        .filter(
            models.Service.id == serviceId,
            models.Service.barbershop_id == barbershop.id,
        )
        .first()
    )

    selected_professional = (
        db.query(models.Professional)
        .filter(
            models.Professional.id == professionalId,
            models.Professional.barbershop_id == barbershop.id,
        )
        .first()
    )

    if not selected_service:
        raise HTTPException(
            status_code=404,
            detail="Serviço não encontrado nessa barbearia",
        )

    if not selected_professional:
        raise HTTPException(
            status_code=404,
            detail="Profissional não encontrado nessa barbearia",
        )

    available_times = get_available_times_for_professional(
        db=db,
        barbershop_id=barbershop.id,
        professional_id=selected_professional.id,
        appointment_date=date,
        duration_minutes=selected_service.duration_minutes or 30,
    )

    return available_times


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

    service_duration_minutes = selected_service.duration_minutes or 30

    validate_appointment_inside_business_hours(
        db=db,
        barbershop_id=barbershop.id,
        appointment_date=appointment_data.date,
        appointment_time=appointment_data.time,
        duration_minutes=service_duration_minutes,
    )

    validate_professional_availability(
        db=db,
        barbershop_id=barbershop.id,
        professional_id=selected_professional.id,
        appointment_date=appointment_data.date,
        appointment_time=appointment_data.time,
        duration_minutes=service_duration_minutes,
    )

    new_appointment = models.Appointment(
        id=str(uuid4()),
        barbershop_id=barbershop.id,
        client_name=appointment_data.clientName.strip(),
        client_phone=appointment_data.clientPhone.strip(),
        service_id=selected_service.id,
        service_name=selected_service.name,
        service_duration_minutes=service_duration_minutes,
        professional_id=selected_professional.id,
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

    if (
        appointment.status == "canceled"
        and status_data.status != "canceled"
    ):
        validate_appointment_inside_business_hours(
            db=db,
            barbershop_id=barbershop.id,
            appointment_date=appointment.date,
            appointment_time=appointment.time,
            duration_minutes=appointment.service_duration_minutes,
        )

        validate_professional_availability(
            db=db,
            barbershop_id=barbershop.id,
            professional_id=appointment.professional_id,
            appointment_date=appointment.date,
            appointment_time=appointment.time,
            duration_minutes=appointment.service_duration_minutes,
            ignored_appointment_id=appointment.id,
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
# ADMIN — GALERIA
# ==================================================

@app.get("/admin/gallery")
def get_admin_gallery(
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    images = (
        db.query(models.GalleryImage)
        .filter(
            models.GalleryImage.barbershop_id
            == current_admin.barbershop_id
        )
        .order_by(models.GalleryImage.id.desc())
        .all()
    )

    return [format_gallery_image(image) for image in images]


@app.post("/admin/gallery")
async def upload_admin_gallery_image(
    file: UploadFile = File(...),
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Envie um arquivo de imagem válido.",
        )

    original_filename = file.filename or "imagem"
    extension = Path(original_filename).suffix.lower()

    if extension not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Use imagens JPG, PNG ou WEBP.",
        )

    safe_filename = f"{uuid4()}{extension}"
    file_path = UPLOADS_DIR / safe_filename

    file_content = await file.read()

    max_size_in_bytes = 5 * 1024 * 1024

    if len(file_content) > max_size_in_bytes:
        raise HTTPException(
            status_code=400,
            detail="A imagem deve ter no máximo 5MB.",
        )

    file_path.write_bytes(file_content)

    new_image = models.GalleryImage(
        barbershop_id=current_admin.barbershop_id,
        image_url=f"/uploads/gallery/{safe_filename}",
        original_filename=original_filename,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )

    db.add(new_image)
    db.commit()
    db.refresh(new_image)

    return format_gallery_image(new_image)


@app.delete("/admin/gallery/{image_id}")
def delete_admin_gallery_image(
    image_id: int,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    image = (
        db.query(models.GalleryImage)
        .filter(
            models.GalleryImage.id == image_id,
            models.GalleryImage.barbershop_id
            == current_admin.barbershop_id,
        )
        .first()
    )

    if not image:
        raise HTTPException(
            status_code=404,
            detail="Imagem não encontrada.",
        )

    image_url = image.image_url

    if image_url.startswith("/uploads/gallery/"):
        filename = image_url.replace("/uploads/gallery/", "")
        file_path = UPLOADS_DIR / filename

        if file_path.exists():
            file_path.unlink()

    db.delete(image)
    db.commit()

    return {
        "message": "Imagem removida com sucesso."
    }


# ==================================================
# ADMIN — APARÊNCIA DA BARBEARIA
# ==================================================

@app.get("/admin/appearance")
def get_admin_appearance(
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

    if not barbershop:
        raise HTTPException(
            status_code=404,
            detail="Barbearia não encontrada",
        )

    return format_barbershop(barbershop)


@app.put("/admin/appearance")
def update_admin_appearance(
    appearance_data: BarbershopAppearanceUpdate,
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

    if not barbershop:
        raise HTTPException(
            status_code=404,
            detail="Barbearia não encontrada",
        )

    barbershop.primary_color = appearance_data.primaryColor
    barbershop.secondary_color = appearance_data.secondaryColor
    barbershop.welcome_text = appearance_data.welcomeText.strip()
    barbershop.description = appearance_data.description.strip()
    barbershop.instagram = (
        appearance_data.instagram.strip()
        if appearance_data.instagram
        else None
    )
    barbershop.whatsapp = (
        appearance_data.whatsapp.strip()
        if appearance_data.whatsapp
        else None
    )
    barbershop.address = (
        appearance_data.address.strip()
        if appearance_data.address
        else None
    )

    db.commit()
    db.refresh(barbershop)

    return format_barbershop(barbershop)


# ==================================================
# ADMIN — FUNCIONAMENTO
# ==================================================

@app.get("/admin/business-hours")
def get_admin_business_hours(
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    ensure_business_hours_exist(
        db,
        current_admin.barbershop_id,
    )

    business_hours = (
        db.query(models.BusinessHour)
        .filter(
            models.BusinessHour.barbershop_id
            == current_admin.barbershop_id
        )
        .order_by(models.BusinessHour.weekday)
        .all()
    )

    return [
        format_business_hour(business_hour)
        for business_hour in business_hours
    ]


@app.put("/admin/business-hours")
def update_admin_business_hours(
    business_hours_data: BusinessHoursUpdate,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    ensure_business_hours_exist(
        db,
        current_admin.barbershop_id,
    )

    received_weekdays = set()

    for business_hour_data in business_hours_data.businessHours:
        if business_hour_data.weekday in received_weekdays:
            raise HTTPException(
                status_code=400,
                detail="Existem dias da semana repetidos na configuração.",
            )

        received_weekdays.add(business_hour_data.weekday)

        validate_business_hour_time(
            business_hour_data.openTime,
            business_hour_data.closeTime,
            business_hour_data.isOpen,
        )

        business_hour = (
            db.query(models.BusinessHour)
            .filter(
                models.BusinessHour.barbershop_id
                == current_admin.barbershop_id,
                models.BusinessHour.weekday
                == business_hour_data.weekday,
            )
            .first()
        )

        if not business_hour:
            business_hour = models.BusinessHour(
                barbershop_id=current_admin.barbershop_id,
                weekday=business_hour_data.weekday,
                is_open=business_hour_data.isOpen,
                open_time=business_hour_data.openTime,
                close_time=business_hour_data.closeTime,
            )

            db.add(business_hour)
        else:
            business_hour.is_open = business_hour_data.isOpen
            business_hour.open_time = business_hour_data.openTime
            business_hour.close_time = business_hour_data.closeTime

    db.commit()

    updated_business_hours = (
        db.query(models.BusinessHour)
        .filter(
            models.BusinessHour.barbershop_id
            == current_admin.barbershop_id
        )
        .order_by(models.BusinessHour.weekday)
        .all()
    )

    return [
        format_business_hour(business_hour)
        for business_hour in updated_business_hours
    ]


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
        duration_minutes=service_data.durationMinutes,
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
    service.duration_minutes = service_data.durationMinutes

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


# ==================================================
# ADMIN — PROFISSIONAIS / FUNCIONÁRIOS
# ==================================================

@app.get("/admin/professionals")
def get_admin_professionals(
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    professionals = (
        db.query(models.Professional)
        .filter(
            models.Professional.barbershop_id
            == current_admin.barbershop_id
        )
        .order_by(models.Professional.name)
        .all()
    )

    return [
        format_professional(professional)
        for professional in professionals
    ]


@app.post("/admin/professionals", status_code=201)
def create_admin_professional(
    professional_data: ProfessionalCreate,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    new_professional = models.Professional(
        barbershop_id=current_admin.barbershop_id,
        name=professional_data.name.strip(),
        specialty=professional_data.specialty.strip(),
    )

    db.add(new_professional)
    db.commit()
    db.refresh(new_professional)

    return format_professional(new_professional)


@app.put("/admin/professionals/{professional_id}")
def update_admin_professional(
    professional_id: int,
    professional_data: ProfessionalUpdate,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    professional = (
        db.query(models.Professional)
        .filter(
            models.Professional.id == professional_id,
            models.Professional.barbershop_id
            == current_admin.barbershop_id,
        )
        .first()
    )

    if not professional:
        raise HTTPException(
            status_code=404,
            detail="Profissional não encontrado",
        )

    professional.name = professional_data.name.strip()
    professional.specialty = professional_data.specialty.strip()

    db.commit()
    db.refresh(professional)

    return format_professional(professional)


@app.delete("/admin/professionals/{professional_id}")
def delete_admin_professional(
    professional_id: int,
    current_admin: models.Admin = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    professional = (
        db.query(models.Professional)
        .filter(
            models.Professional.id == professional_id,
            models.Professional.barbershop_id
            == current_admin.barbershop_id,
        )
        .first()
    )

    if not professional:
        raise HTTPException(
            status_code=404,
            detail="Profissional não encontrado",
        )

    db.delete(professional)
    db.commit()

    return {
        "message": "Profissional excluído com sucesso"
    }
