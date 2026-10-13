from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import LoginResponse, UserCreate, UserLogin, UserPublic

router = APIRouter(tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register_user(data: UserCreate, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User).where(User.username == data.username)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already registered.",
        )

    email = str(data.email)
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    user = User(
        username=data.username,
        email=email,
        password_hash=get_password_hash(data.password),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email is already registered.",
        ) from error

    db.refresh(user)
    return user


@router.post("/login", response_model=LoginResponse)
def login_user(data: UserLogin, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.username == data.username))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    return LoginResponse(access_token=create_access_token(user.id), user=user)


@router.get("/me", response_model=UserPublic)
def get_current_user_profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user
