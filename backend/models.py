from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from database import Base


class Barbershop(Base):
    __tablename__ = "barbershops"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)

    primary_color = Column(String, nullable=False, default="#ffffff")
    secondary_color = Column(String, nullable=False, default="#000000")
    welcome_text = Column(String, nullable=False, default="Agende seu horário")
    description = Column(
        String,
        nullable=False,
        default="Escolha o serviço, o profissional, a data e veja os horários disponíveis.",
    )
    instagram = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    address = Column(String, nullable=True)


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    barbershop_id = Column(String, ForeignKey("barbershops.id"), nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)


class Professional(Base):
    __tablename__ = "professionals"

    id = Column(Integer, primary_key=True, index=True)
    barbershop_id = Column(String, ForeignKey("barbershops.id"), nullable=False)
    name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True)
    barbershop_id = Column(String, ForeignKey("barbershops.id"), nullable=False)

    client_name = Column(String, nullable=False)
    client_phone = Column(String, nullable=False)

    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    service_name = Column(String, nullable=False)
    service_duration_minutes = Column(Integer, nullable=False, default=30)

    professional_id = Column(Integer, ForeignKey("professionals.id"), nullable=False)
    professional_name = Column(String, nullable=False)
    professional_specialty = Column(String, nullable=False)

    date = Column(String, nullable=False)
    time = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    status = Column(String, nullable=False, default="pending")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    barbershop_id = Column(String, ForeignKey("barbershops.id"), nullable=False)



class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id = Column(Integer, primary_key=True, index=True)
    barbershop_id = Column(String, ForeignKey("barbershops.id"), nullable=False)
    image_url = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    created_at = Column(String, nullable=False)


class BusinessHour(Base):
    __tablename__ = "business_hours"

    id = Column(Integer, primary_key=True, index=True)
    barbershop_id = Column(String, ForeignKey("barbershops.id"), nullable=False)

    # 0 = segunda, 1 = terça, 2 = quarta, 3 = quinta,
    # 4 = sexta, 5 = sábado, 6 = domingo
    weekday = Column(Integer, nullable=False)

    is_open = Column(Boolean, nullable=False, default=True)

    open_time = Column(String, nullable=False, default="09:00")
    close_time = Column(String, nullable=False, default="18:00")

    __table_args__ = (
        UniqueConstraint(
            "barbershop_id",
            "weekday",
            name="unique_barbershop_weekday",
        ),
    )
