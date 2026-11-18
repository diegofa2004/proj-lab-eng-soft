from sqlalchemy import create_engine

from app.api.endpoints.catalog import catalog


def test_catalog_filters_books_by_source():
    engine = create_engine("sqlite://")
    with engine.connect() as db:
        db.exec_driver_sql("ATTACH DATABASE ':memory:' AS plataforma")
        db.exec_driver_sql(
            "CREATE TABLE plataforma.v_catalogo_publico "
            "(id_livro INTEGER, titulo TEXT, origem TEXT, data_publicacao TEXT)"
        )
        db.exec_driver_sql(
            "CREATE TABLE plataforma.livro_genero (id_livro INTEGER, id_genero INTEGER)"
        )
        db.exec_driver_sql(
            "CREATE TABLE plataforma.livro_autor (id_livro INTEGER, id_autor INTEGER)"
        )
        db.exec_driver_sql("CREATE TABLE plataforma.autor (id_autor INTEGER, nome TEXT)")
        db.exec_driver_sql(
            "INSERT INTO plataforma.v_catalogo_publico VALUES "
            "(1, 'Official book', 'catalogo', '2026-01-02'), "
            "(2, 'Community story', 'usuario', '2026-01-01')"
        )

        community = catalog(db, source="usuario")
        official = catalog(db, source="catalogo")
        all_books = catalog(db)

    assert [book["origem"] for book in community] == ["usuario"]
    assert [book["origem"] for book in official] == ["catalogo"]
    assert {book["origem"] for book in all_books} == {"catalogo", "usuario"}
