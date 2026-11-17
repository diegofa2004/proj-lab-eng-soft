from datetime import UTC, date, datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.api.endpoints.account import purchase_plan
from app.core.config import settings
from app.db.session import Base
from app.models.assinatura import Assinatura, AssinaturaMembro
from app.models.pagamento import Pagamento
from app.models.plano import Plano
from app.models.user import User


@pytest.fixture()
def family_db(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path}/family-subscription.db",
        execution_options={"schema_translate_map": {"plataforma": None}},
    )
    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            Plano.__table__,
            Assinatura.__table__,
            AssinaturaMembro.__table__,
            Pagamento.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def create_reader(db, username: str, email: str) -> User:
    reader = User(username=username, email=email, password_hash="not-a-real-password-hash")
    db.add(reader)
    db.commit()
    return reader


def test_family_checkout_grants_premium_to_registered_members(family_db):
    owner = create_reader(family_db, "owner", "owner@example.com")
    member = create_reader(family_db, "member", "member@example.com")
    family_db.add(
        Plano(
            nome="Family",
            preco=29.90,
            moeda="BRL",
            periodicidade="mensal",
            tier="family_and_friends",
            max_members=4,
            requires_adult_holder=True,
        )
    )
    family_db.commit()
    plan = family_db.scalar(select(Plano))

    original_demo_billing = settings.DEMO_BILLING
    settings.DEMO_BILLING = True
    try:
        result = purchase_plan(
            family_db,
            owner,
            plan.id_plano,
            holder_birth_date=date(1990, 1, 1),
            holder_age_confirmed=True,
            member_emails=[member.email],
        )
    finally:
        settings.DEMO_BILLING = original_demo_billing

    subscription = result["subscription"]
    assert subscription.titular_adulto_confirmado_em is not None
    assert family_db.scalar(
        select(AssinaturaMembro).where(
            AssinaturaMembro.id_assinatura == subscription.id_assinatura,
            AssinaturaMembro.id_usuario == member.id,
        )
    ) is not None


def test_family_checkout_rejects_underage_holder(family_db):
    owner = create_reader(family_db, "owner", "owner@example.com")
    family_db.add(
        Plano(
            nome="Family",
            preco=29.90,
            moeda="BRL",
            periodicidade="mensal",
            tier="family_and_friends",
            max_members=4,
            requires_adult_holder=True,
        )
    )
    family_db.commit()
    plan = family_db.scalar(select(Plano))

    original_demo_billing = settings.DEMO_BILLING
    settings.DEMO_BILLING = True
    try:
        with pytest.raises(HTTPException, match="at least 18"):
            purchase_plan(
                family_db,
                owner,
                plan.id_plano,
                holder_birth_date=date(datetime.now(UTC).year - 17, 1, 1),
                holder_age_confirmed=True,
            )
    finally:
        settings.DEMO_BILLING = original_demo_billing
