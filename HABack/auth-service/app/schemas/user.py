from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr


class UserStatus(StrEnum):
    ACTIVO = "ACTIVO"
    INACTIVO = "INACTIVO"
    SUSPENDIDO = "SUSPENDIDO"
    PENDIENTE = "PENDIENTE"


class Genero(StrEnum):
    MASCULINO = "MASCULINO"
    FEMENINO = "FEMENINO"
    OTRO = "OTRO"


class NivelEducativo(StrEnum):
    PRIMARIA = "PRIMARIA"
    SECUNDARIA = "SECUNDARIA"
    SUPERIOR = "SUPERIOR"
    POSTGRADO = "POSTGRADO"
    NINGUNO = "NINGUNO"


class RoleOut(BaseModel):
    id: str
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    identifier: str | None = None
    phone_number: str | None = None
    edad: int | None = None
    genero: Genero | None = None
    nivel_educativo: NivelEducativo | None = None
    status: UserStatus | None = UserStatus.ACTIVO


class UserOut(UserBase):
    id: str
    role: RoleOut
    status: UserStatus
    first_name: str | None = None
    last_name: str | None = None
    identifier: str | None = None
    phone_number: str | None = None
    edad: int | None = None
    genero: Genero | None = None
    nivel_educativo: NivelEducativo | None = None

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    model_config = ConfigDict(
        json_schema_extra={"example": {"email": "admin@finca.com", "password": "tu_contraseña_segura"}}
    )


class Token(BaseModel):
    access_token: str
    token_type: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }
    )


class TokenData(BaseModel):
    user_id: str | None = None
    session_token: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
