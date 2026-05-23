import sqlite3
from pathlib import Path

DATABASES_DIR = Path(__file__).resolve().parents[1] / "app" / "data" / "databases"


def reset_database(name: str) -> sqlite3.Connection:
    DATABASES_DIR.mkdir(parents=True, exist_ok=True)
    path = DATABASES_DIR / name
    if path.exists():
        path.unlink()
    return sqlite3.connect(path)


def insert_many(connection: sqlite3.Connection, table: str, columns: tuple[str, ...], rows: list[tuple]) -> None:
    placeholders = ", ".join("?" for _ in columns)
    column_names = ", ".join(columns)
    connection.executemany(f"INSERT INTO {table} ({column_names}) VALUES ({placeholders})", rows)


def seed_saude() -> None:
    connection = reset_database("saude.db")
    connection.executescript(
        """
        CREATE TABLE hospitais (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            cidade TEXT NOT NULL
        );

        CREATE TABLE internacoes (
            id INTEGER PRIMARY KEY,
            hospital_id INTEGER NOT NULL,
            paciente_id INTEGER NOT NULL,
            data_entrada TEXT NOT NULL,
            custo_total REAL NOT NULL,
            FOREIGN KEY (hospital_id) REFERENCES hospitais(id)
        );

        CREATE TABLE consultas (
            id INTEGER PRIMARY KEY,
            especialidade TEXT NOT NULL,
            dias_espera INTEGER NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE medicamentos_estoque (
            id INTEGER PRIMARY KEY,
            medicamento TEXT NOT NULL,
            unidade TEXT NOT NULL,
            estoque_atual INTEGER NOT NULL,
            estoque_minimo INTEGER NOT NULL
        );
        """
    )
    insert_many(
        connection,
        "hospitais",
        ("id", "nome", "cidade"),
        [
            (1, "Hospital Central", "São Paulo"),
            (2, "Hospital Norte", "Campinas"),
            (3, "Hospital Atlântico", "Rio de Janeiro"),
            (4, "Hospital Vida", "Belo Horizonte"),
        ],
    )
    insert_many(
        connection,
        "internacoes",
        ("hospital_id", "paciente_id", "data_entrada", "custo_total"),
        [
            (1, 101, "2026-01-08", 180000.0),
            (1, 102, "2026-02-14", 245000.5),
            (1, 103, "2026-03-20", 308500.0),
            (2, 104, "2026-01-18", 120000.0),
            (2, 105, "2026-03-02", 156800.0),
            (3, 106, "2026-02-09", 221400.0),
            (3, 107, "2026-03-25", 198700.0),
            (4, 108, "2026-01-31", 160250.0),
            (4, 109, "2025-12-20", 999999.0),
        ],
    )
    insert_many(
        connection,
        "consultas",
        ("especialidade", "dias_espera", "status"),
        [
            ("Cardiologia", 18, "realizada"),
            ("Cardiologia", 24, "realizada"),
            ("Cardiologia", 10, "cancelada"),
            ("Ortopedia", 12, "realizada"),
            ("Ortopedia", 16, "realizada"),
            ("Dermatologia", 9, "realizada"),
            ("Dermatologia", 11, "realizada"),
            ("Neurologia", 30, "realizada"),
            ("Neurologia", 27, "realizada"),
        ],
    )
    insert_many(
        connection,
        "medicamentos_estoque",
        ("medicamento", "unidade", "estoque_atual", "estoque_minimo"),
        [
            ("Insulina NPH", "Farmácia Central", 8, 20),
            ("Heparina", "UTI Adulto", 12, 25),
            ("Amoxicilina", "Pronto Atendimento", 18, 30),
            ("Dipirona", "Farmácia Central", 90, 50),
            ("Soro fisiológico", "Centro Cirúrgico", 40, 40),
        ],
    )
    connection.commit()
    connection.close()


def seed_tecnologia() -> None:
    connection = reset_database("tecnologia.db")
    connection.executescript(
        """
        CREATE TABLE servicos (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            squad TEXT NOT NULL
        );

        CREATE TABLE incidentes (
            id INTEGER PRIMARY KEY,
            servico_id INTEGER NOT NULL,
            severidade TEXT NOT NULL,
            aberto_em TEXT NOT NULL,
            FOREIGN KEY (servico_id) REFERENCES servicos(id)
        );

        CREATE TABLE deploys (
            id INTEGER PRIMARY KEY,
            aplicacao TEXT NOT NULL,
            rollback INTEGER NOT NULL,
            criado_em TEXT NOT NULL
        );

        CREATE TABLE cloud_custos (
            id INTEGER PRIMARY KEY,
            squad TEXT NOT NULL,
            recurso TEXT NOT NULL,
            custo_usd REAL NOT NULL,
            status TEXT NOT NULL,
            data_referencia TEXT NOT NULL
        );
        """
    )
    insert_many(
        connection,
        "servicos",
        ("id", "nome", "squad"),
        [
            (1, "Pagamentos", "Core"),
            (2, "Autenticação", "Plataforma"),
            (3, "Relatórios", "Dados"),
            (4, "Notificações", "Engajamento"),
        ],
    )
    insert_many(
        connection,
        "incidentes",
        ("servico_id", "severidade", "aberto_em"),
        [
            (1, "crítica", "2026-04-03"),
            (1, "crítica", "2026-04-18"),
            (1, "média", "2026-04-20"),
            (2, "crítica", "2026-04-12"),
            (2, "baixa", "2026-04-15"),
            (3, "crítica", "2026-04-22"),
            (3, "crítica", "2026-03-29"),
            (4, "alta", "2026-04-10"),
            (4, "crítica", "2026-05-02"),
        ],
    )
    insert_many(
        connection,
        "deploys",
        ("aplicacao", "rollback", "criado_em"),
        [
            ("Checkout", 1, "2026-04-02"),
            ("Checkout", 1, "2026-04-21"),
            ("Checkout", 0, "2026-04-24"),
            ("API Parceiros", 1, "2026-04-07"),
            ("API Parceiros", 0, "2026-04-18"),
            ("Portal Admin", 1, "2026-04-14"),
            ("Portal Admin", 1, "2026-03-31"),
            ("App Mobile", 1, "2026-05-01"),
            ("Relatórios", 0, "2026-04-09"),
        ],
    )
    insert_many(
        connection,
        "cloud_custos",
        ("squad", "recurso", "custo_usd", "status", "data_referencia"),
        [
            ("Dados", "warehouse-prod", 10000.25, "ativo", "2026-05-05"),
            ("Dados", "pipelines-batch", 8420.50, "ativo", "2026-05-18"),
            ("Dados", "cluster-legado", 5000.00, "inativo", "2026-05-20"),
            ("Checkout", "api-pagamentos", 8000.40, "ativo", "2026-05-09"),
            ("Checkout", "cache-carrinho", 5250.00, "ativo", "2026-05-21"),
            ("Core", "servicos-base", 9780.00, "ativo", "2026-05-11"),
            ("Growth", "experimentos", 4210.90, "ativo", "2026-05-28"),
            ("Growth", "campanha-antiga", 999.00, "ativo", "2026-04-30"),
        ],
    )
    connection.commit()
    connection.close()


def seed_esporte() -> None:
    connection = reset_database("esporte.db")
    connection.executescript(
        """
        CREATE TABLE jogadores (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            posicao TEXT NOT NULL
        );

        CREATE TABLE finalizacoes_partida (
            id INTEGER PRIMARY KEY,
            jogador_id INTEGER NOT NULL,
            data_jogo TEXT NOT NULL,
            gols INTEGER NOT NULL,
            finalizacoes INTEGER NOT NULL,
            FOREIGN KEY (jogador_id) REFERENCES jogadores(id)
        );

        CREATE TABLE treinos (
            id INTEGER PRIMARY KEY,
            atleta TEXT NOT NULL,
            data TEXT NOT NULL,
            carga_treino REAL NOT NULL,
            status TEXT NOT NULL
        );

        CREATE TABLE contratos_atletas (
            id INTEGER PRIMARY KEY,
            atleta TEXT NOT NULL,
            posicao TEXT NOT NULL,
            fim_contrato TEXT NOT NULL
        );
        """
    )
    insert_many(connection, "jogadores", ("id", "nome", "posicao"), [(1, "Lia Torres", "Atacante"), (2, "Bruno Reis", "Atacante"), (3, "Caio Lima", "Atacante"), (4, "Rafa Nogueira", "Meia")])
    insert_many(
        connection,
        "finalizacoes_partida",
        ("jogador_id", "data_jogo", "gols", "finalizacoes"),
        [(1, "2026-03-05", 3, 7), (1, "2026-03-18", 3, 6), (2, "2026-03-07", 1, 4), (2, "2026-03-22", 2, 5), (3, "2026-03-03", 1, 4), (3, "2026-03-29", 1, 4), (4, "2026-03-11", 0, 0), (1, "2026-04-02", 5, 5), (2, "2026-02-25", 4, 8)],
    )
    insert_many(
        connection,
        "treinos",
        ("atleta", "data", "carga_treino", "status"),
        [("Rafa Nogueira", "2026-03-02", 90.0, "concluido"), ("Rafa Nogueira", "2026-03-05", 85.0, "concluido"), ("Rafa Nogueira", "2026-03-08", 40.0, "cancelado"), ("Lia Torres", "2026-03-02", 80.0, "concluido"), ("Lia Torres", "2026-03-06", 84.0, "concluido"), ("Caio Lima", "2026-03-01", 80.0, "concluido"), ("Caio Lima", "2026-03-04", 70.0, "concluido"), ("Caio Lima", "2026-03-09", 76.0, "concluido"), ("Bruno Reis", "2026-03-03", 68.0, "concluido"), ("Bruno Reis", "2026-03-07", 70.0, "concluido"), ("Dani Costa", "2026-03-10", 95.0, "planejado")],
    )
    insert_many(
        connection,
        "contratos_atletas",
        ("atleta", "posicao", "fim_contrato"),
        [("Davi Prado", "Goleiro", "2026-06-30"), ("Lia Torres", "Atacante", "2026-07-15"), ("Caio Lima", "Meia", "2026-08-20"), ("Rafa Nogueira", "Zagueiro", "2026-09-10"), ("Bruno Reis", "Lateral", "2026-05-20")],
    )
    connection.commit()
    connection.close()


def seed_industria() -> None:
    connection = reset_database("industria.db")
    connection.executescript(
        """
        CREATE TABLE maquinas (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            setor TEXT NOT NULL
        );

        CREATE TABLE paradas (
            id INTEGER PRIMARY KEY,
            maquina_id INTEGER NOT NULL,
            inicio TEXT NOT NULL,
            minutos_parada INTEGER NOT NULL,
            motivo TEXT NOT NULL,
            FOREIGN KEY (maquina_id) REFERENCES maquinas(id)
        );

        CREATE TABLE producao_diaria (
            id INTEGER PRIMARY KEY,
            linha TEXT NOT NULL,
            data TEXT NOT NULL,
            unidades_produzidas INTEGER NOT NULL,
            percentual_refugo REAL NOT NULL
        );

        CREATE TABLE leituras_sensores (
            id INTEGER PRIMARY KEY,
            maquina_id INTEGER NOT NULL,
            data_leitura TEXT NOT NULL,
            temperatura_c REAL NOT NULL,
            FOREIGN KEY (maquina_id) REFERENCES maquinas(id)
        );
        """
    )
    insert_many(connection, "maquinas", ("id", "nome", "setor"), [(1, "Pintura 01", "Pintura"), (2, "Pintura 02", "Pintura"), (3, "Montagem 01", "Montagem"), (4, "Corte 01", "Corte"), (101, "Forno 02", "Tratamento térmico"), (102, "Prensa 04", "Estamparia"), (103, "Esteira 01", "Montagem")])
    insert_many(connection, "paradas", ("maquina_id", "inicio", "minutos_parada", "motivo"), [(1, "2026-05-03 08:00:00", 180, "falha mecânica"), (2, "2026-05-11 14:00:00", 240, "setup prolongado"), (3, "2026-05-08 10:30:00", 130, "falta de componente"), (3, "2026-05-19 16:00:00", 180, "ajuste de linha"), (4, "2026-05-15 09:00:00", 120, "manutenção corretiva"), (1, "2026-04-29 07:00:00", 300, "fora do período"), (4, "2026-06-01 08:00:00", 90, "fora do período")])
    insert_many(connection, "producao_diaria", ("linha", "data", "unidades_produzidas", "percentual_refugo"), [("Linha C", "2026-05-02", 900, 6.0), ("Linha C", "2026-05-16", 880, 6.2), ("Linha A", "2026-05-04", 1100, 3.5), ("Linha A", "2026-05-18", 1050, 4.0), ("Linha B", "2026-05-06", 1200, 2.0), ("Linha B", "2026-05-20", 1180, 2.8), ("Linha C", "2026-04-27", 870, 12.0), ("Linha A", "2026-06-01", 1000, 8.0)])
    insert_many(connection, "leituras_sensores", ("maquina_id", "data_leitura", "temperatura_c"), [(101, "2026-05-03", 90.0), (101, "2026-05-12", 93.0), (101, "2026-05-20", 79.0), (102, "2026-05-07", 85.5), (102, "2026-05-18", 88.0), (103, "2026-05-09", 81.4), (103, "2026-05-23", 83.0), (103, "2026-06-02", 95.0)])
    connection.commit()
    connection.close()


def seed_educacao() -> None:
    connection = reset_database("educacao.db")
    connection.executescript(
        """
        CREATE TABLE disciplinas (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL
        );

        CREATE TABLE avaliacoes (
            id INTEGER PRIMARY KEY,
            disciplina_id INTEGER NOT NULL,
            aluno TEXT NOT NULL,
            bimestre INTEGER NOT NULL,
            nota REAL NOT NULL,
            FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
        );

        CREATE TABLE presencas (
            id INTEGER PRIMARY KEY,
            aluno TEXT NOT NULL,
            data TEXT NOT NULL,
            presente INTEGER NOT NULL
        );

        CREATE TABLE bolsas_estudo (
            id INTEGER PRIMARY KEY,
            aluno TEXT NOT NULL,
            curso TEXT NOT NULL,
            valor_mensal REAL NOT NULL,
            status TEXT NOT NULL
        );
        """
    )
    insert_many(connection, "disciplinas", ("id", "nome"), [(1, "Matemática"), (2, "Física"), (3, "Química"), (4, "História")])
    insert_many(connection, "avaliacoes", ("disciplina_id", "aluno", "bimestre", "nota"), [(1, "Nina Lopes", 2, 6.0), (1, "João Mendes", 2, 5.9), (2, "Bia Rocha", 2, 6.1), (2, "Lara Dias", 2, 6.7), (3, "Nina Lopes", 2, 6.8), (3, "João Mendes", 2, 6.9), (4, "Bia Rocha", 2, 8.2), (1, "Nina Lopes", 1, 9.5), (2, "Lara Dias", 1, 4.0)])
    insert_many(connection, "presencas", ("aluno", "data", "presente"), [("Nina Lopes", "2026-04-01", 1), ("Nina Lopes", "2026-04-03", 1), ("Nina Lopes", "2026-04-08", 1), ("Nina Lopes", "2026-04-10", 0), ("Nina Lopes", "2026-04-15", 0), ("João Mendes", "2026-04-01", 1), ("João Mendes", "2026-04-08", 1), ("João Mendes", "2026-04-15", 0), ("Bia Rocha", "2026-04-01", 1), ("Bia Rocha", "2026-04-02", 1), ("Bia Rocha", "2026-04-03", 1), ("Bia Rocha", "2026-04-06", 1), ("Bia Rocha", "2026-04-07", 1), ("Bia Rocha", "2026-04-08", 1), ("Bia Rocha", "2026-04-09", 1), ("Bia Rocha", "2026-04-10", 1), ("Bia Rocha", "2026-04-13", 0), ("Bia Rocha", "2026-04-14", 0), ("Bia Rocha", "2026-04-15", 0), ("Lara Dias", "2026-04-01", 1), ("Lara Dias", "2026-04-08", 1), ("Lara Dias", "2026-04-15", 1), ("Nina Lopes", "2026-05-02", 0)])
    insert_many(connection, "bolsas_estudo", ("aluno", "curso", "valor_mensal", "status"), [("Ana Souza", "Engenharia de Software", 2200.00, "ativa"), ("Bruno Lima", "Engenharia de Software", 2000.00, "ativa"), ("Carla Dias", "Administração", 1500.25, "ativa"), ("Diego Alves", "Administração", 1650.25, "ativa"), ("Eva Rocha", "Design", 2800.00, "ativa"), ("Fabio Nunes", "Pedagogia", 1900.00, "ativa"), ("Gabi Melo", "Design", 900.00, "suspensa")])
    connection.commit()
    connection.close()


def seed_arte() -> None:
    connection = reset_database("arte.db")
    connection.executescript(
        """
        CREATE TABLE artistas (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL
        );

        CREATE TABLE obras (
            id INTEGER PRIMARY KEY,
            artista_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            FOREIGN KEY (artista_id) REFERENCES artistas(id)
        );

        CREATE TABLE vendas (
            id INTEGER PRIMARY KEY,
            obra_id INTEGER NOT NULL,
            valor_venda REAL NOT NULL,
            status TEXT NOT NULL,
            data_venda TEXT NOT NULL,
            FOREIGN KEY (obra_id) REFERENCES obras(id)
        );

        CREATE TABLE interacoes_obras (
            id INTEGER PRIMARY KEY,
            obra TEXT NOT NULL,
            tipo_interacao TEXT NOT NULL,
            criada_em TEXT NOT NULL
        );

        CREATE TABLE restauracoes (
            id INTEGER PRIMARY KEY,
            obra TEXT NOT NULL,
            restaurador TEXT NOT NULL,
            prazo_entrega TEXT NOT NULL,
            status TEXT NOT NULL
        );
        """
    )
    insert_many(connection, "artistas", ("id", "nome"), [(1, "Maya Castro"), (2, "Theo Ramos"), (3, "Luna Alves"), (4, "Noah Freitas")])
    insert_many(connection, "obras", ("id", "artista_id", "titulo"), [(1, 1, "Cidade Submersa"), (2, 1, "Mapa do Vento"), (3, 2, "Retrato em Azul"), (4, 3, "Jardim de Concreto"), (5, 3, "Silêncio Vermelho"), (6, 4, "Horizonte Partido")])
    insert_many(connection, "vendas", ("obra_id", "valor_venda", "status", "data_venda"), [(1, 15000.0, "concluida", "2026-01-20"), (2, 13500.0, "concluida", "2026-03-11"), (3, 19400.5, "concluida", "2026-02-08"), (4, 10000.0, "concluida", "2026-02-25"), (5, 3800.0, "concluida", "2026-03-18"), (6, 50000.0, "reservada", "2026-03-22"), (1, 7000.0, "cancelada", "2026-02-17"), (3, 12000.0, "concluida", "2026-04-03")])
    insert_many(connection, "interacoes_obras", ("obra", "tipo_interacao", "criada_em"), [("Cidade Submersa", "favorito", "2026-03-01"), ("Cidade Submersa", "favorito", "2026-03-02"), ("Cidade Submersa", "favorito", "2026-03-03"), ("Cidade Submersa", "favorito", "2026-03-04"), ("Cidade Submersa", "favorito", "2026-03-05"), ("Retrato em Azul", "favorito", "2026-03-01"), ("Retrato em Azul", "favorito", "2026-03-03"), ("Retrato em Azul", "favorito", "2026-03-06"), ("Retrato em Azul", "favorito", "2026-03-08"), ("Jardim de Concreto", "favorito", "2026-03-01"), ("Jardim de Concreto", "favorito", "2026-03-07"), ("Jardim de Concreto", "favorito", "2026-03-09"), ("Silêncio Vermelho", "favorito", "2026-03-02"), ("Silêncio Vermelho", "favorito", "2026-03-04"), ("Silêncio Vermelho", "favorito", "2026-03-06"), ("Cidade Submersa", "visualizacao", "2026-03-10"), ("Retrato em Azul", "compartilhamento", "2026-03-11")])
    insert_many(connection, "restauracoes", ("obra", "restaurador", "prazo_entrega", "status"), [("Noite de Bronze", "Clara Nunes", "2026-05-15", "em andamento"), ("Mar em Cinzas", "Otto Vieira", "2026-05-23", "em andamento"), ("Figura Partida", "Maya Castro", "2026-05-29", "em andamento"), ("Jardim Azul", "Lina Prado", "2026-06-10", "em andamento"), ("Retrato Antigo", "Caio Mota", "2026-05-20", "concluida")])
    connection.commit()
    connection.close()


def seed_agricultura() -> None:
    connection = reset_database("agricultura.db")
    connection.executescript(
        """
        CREATE TABLE talhoes (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            area_ha REAL NOT NULL
        );

        CREATE TABLE colheitas (
            id INTEGER PRIMARY KEY,
            talhao_id INTEGER NOT NULL,
            talhao TEXT NOT NULL,
            cultura TEXT NOT NULL,
            safra TEXT NOT NULL,
            produtividade_kg_ha REAL NOT NULL,
            meta_kg_ha REAL NOT NULL,
            FOREIGN KEY (talhao_id) REFERENCES talhoes(id)
        );

        CREATE TABLE irrigacoes (
            id INTEGER PRIMARY KEY,
            talhao_id INTEGER NOT NULL,
            data TEXT NOT NULL,
            volume_m3 REAL NOT NULL,
            FOREIGN KEY (talhao_id) REFERENCES talhoes(id)
        );

        CREATE TABLE inspecoes_pragas (
            id INTEGER PRIMARY KEY,
            talhao TEXT NOT NULL,
            praga TEXT NOT NULL,
            severidade REAL NOT NULL,
            data_inspecao TEXT NOT NULL
        );
        """
    )
    insert_many(connection, "talhoes", ("id", "nome", "area_ha"), [(1, "T01", 42.5), (2, "T02", 37.0), (3, "T03", 29.0), (4, "T04", 33.5), (5, "T05", 25.0)])
    insert_many(connection, "colheitas", ("talhao_id", "talhao", "cultura", "safra", "produtividade_kg_ha", "meta_kg_ha"), [(1, "T01", "Soja", "2026", 7200.0, 7500.0), (2, "T02", "Milho", "2026", 6100.0, 6000.0), (3, "T03", "Milho", "2026", 6100.0, 6500.0), (4, "T04", "Soja", "2026", 7800.0, 7600.0), (5, "T05", "Soja", "2026", 7350.0, 7600.0), (1, "T01", "Soja", "2025", 6800.0, 7000.0)])
    insert_many(connection, "irrigacoes", ("talhao_id", "data", "volume_m3"), [(1, "2026-01-10", 1200.0), (1, "2026-03-12", 1400.0), (2, "2026-02-02", 600.0), (2, "2026-04-18", 1000.0), (3, "2026-01-15", 1100.0), (3, "2026-04-03", 1400.0), (4, "2026-02-20", 1200.0), (4, "2026-03-22", 1200.0), (5, "2026-05-02", 900.0), (2, "2025-12-20", 500.0)])
    insert_many(connection, "inspecoes_pragas", ("talhao", "praga", "severidade", "data_inspecao"), [("T03", "Lagarta-do-cartucho", 4.0, "2026-04-05"), ("T03", "Lagarta-do-cartucho", 5.0, "2026-04-22"), ("T01", "Percevejo", 3.5, "2026-04-08"), ("T01", "Percevejo", 4.0, "2026-04-19"), ("T05", "Ferrugem", 3.0, "2026-04-15"), ("T02", "Mosca-branca", 2.5, "2026-04-16"), ("T03", "Lagarta-do-cartucho", 5.0, "2026-05-02")])
    connection.commit()
    connection.close()


def seed_logistica() -> None:
    connection = reset_database("logistica.db")
    connection.executescript(
        """
        CREATE TABLE entregas (
            id INTEGER PRIMARY KEY,
            origem TEXT NOT NULL,
            destino TEXT NOT NULL,
            dias_atraso INTEGER NOT NULL,
            custo_frete REAL NOT NULL
        );

        CREATE TABLE estoque_movimentos (
            id INTEGER PRIMARY KEY,
            produto TEXT NOT NULL,
            dias_em_estoque INTEGER NOT NULL,
            quantidade INTEGER NOT NULL
        );

        CREATE TABLE abastecimentos_frota (
            id INTEGER PRIMARY KEY,
            placa TEXT NOT NULL,
            data_abastecimento TEXT NOT NULL,
            litros REAL NOT NULL,
            km_rodados REAL NOT NULL
        );
        """
    )
    insert_many(connection, "entregas", ("origem", "destino", "dias_atraso", "custo_frete"), [("São Paulo", "Curitiba", 2, 540.0), ("São Paulo", "Curitiba", 0, 510.0), ("São Paulo", "Curitiba", 3, 560.0), ("Rio de Janeiro", "Salvador", 5, 890.0), ("Rio de Janeiro", "Salvador", 1, 910.0), ("Belo Horizonte", "Vitoria", 0, 300.0), ("Belo Horizonte", "Vitoria", 2, 340.0), ("Campinas", "Goiania", 4, 720.0), ("Campinas", "Goiania", 6, 760.0), ("Campinas", "Goiania", 0, 700.0)])
    insert_many(connection, "estoque_movimentos", ("produto", "dias_em_estoque", "quantidade"), [("Monitor 27", 42, 12), ("Monitor 27", 36, 9), ("Teclado mecânico", 18, 30), ("Teclado mecânico", 22, 28), ("Cadeira ergonômica", 55, 6), ("Cadeira ergonômica", 61, 4), ("Webcam HD", 14, 35), ("Webcam HD", 11, 44)])
    insert_many(connection, "abastecimentos_frota", ("placa", "data_abastecimento", "litros", "km_rodados"), [("TRK-2045", "2026-05-04", 180.00, 520.00), ("TRK-1188", "2026-05-11", 250.00, 850.00), ("TRK-7720", "2026-05-18", 196.00, 800.00), ("TRK-0000", "2026-05-20", 50.00, 0.00), ("TRK-2045", "2026-04-28", 200.00, 400.00)])
    connection.commit()
    connection.close()


def seed_games() -> None:
    connection = reset_database("games.db")
    connection.executescript(
        """
        CREATE TABLE sessoes_fase (
            id INTEGER PRIMARY KEY,
            jogador TEXT NOT NULL,
            fase TEXT NOT NULL,
            abandonou INTEGER NOT NULL CHECK (abandonou IN (0, 1))
        );

        CREATE TABLE partidas_personagem (
            id INTEGER PRIMARY KEY,
            personagem TEXT NOT NULL,
            venceu INTEGER NOT NULL CHECK (venceu IN (0, 1))
        );

        CREATE TABLE sessoes_dispositivo (
            id INTEGER PRIMARY KEY,
            dispositivo TEXT NOT NULL,
            inicio TEXT NOT NULL,
            crash INTEGER NOT NULL CHECK (crash IN (0, 1))
        );
        """
    )
    insert_many(connection, "sessoes_fase", ("jogador", "fase", "abandonou"), [("Ana", "Prólogo", 0), ("Bruno", "Prólogo", 0), ("Caio", "Prólogo", 0), ("Ana", "Mina Congelada", 1), ("Bruno", "Mina Congelada", 1), ("Caio", "Mina Congelada", 0), ("Duda", "Mina Congelada", 1), ("Eli", "Torre Solar", 0), ("Fabi", "Torre Solar", 1), ("Gus", "Torre Solar", 0)])
    insert_many(connection, "partidas_personagem", ("personagem", "venceu"), [("Astra", 1), ("Astra", 1), ("Astra", 0), ("Bruma", 1), ("Bruma", 0), ("Bruma", 0), ("Nix", 1), ("Nix", 1), ("Nix", 1), ("Nix", 0), ("Rook", 0), ("Rook", 1), ("Rook", 0)])
    insert_many(connection, "sessoes_dispositivo", ("dispositivo", "inicio", "crash"), [("Galaxy A32", "2026-05-01", 1), ("Galaxy A32", "2026-05-06", 1), ("Galaxy A32", "2026-05-13", 1), ("Galaxy A32", "2026-05-22", 0), ("Moto G Power", "2026-05-03", 1), ("Moto G Power", "2026-05-08", 0), ("Moto G Power", "2026-05-14", 1), ("Moto G Power", "2026-05-21", 0), ("Moto G Power", "2026-05-29", 0), ("iPhone 12", "2026-05-02", 1), ("iPhone 12", "2026-05-09", 0), ("iPhone 12", "2026-05-16", 0), ("iPhone 12", "2026-05-23", 0), ("Pixel 7", "2026-05-05", 1), ("Pixel 7", "2026-05-12", 0)])
    connection.commit()
    connection.close()


def seed_financas() -> None:
    connection = reset_database("financas.db")
    connection.executescript(
        """
        CREATE TABLE clientes (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            segmento TEXT NOT NULL
        );

        CREATE TABLE emprestimos (
            id INTEGER PRIMARY KEY,
            cliente_id INTEGER NOT NULL,
            valor_contratado REAL NOT NULL,
            status TEXT NOT NULL,
            classificacao_risco TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        );

        CREATE TABLE pagamentos (
            id INTEGER PRIMARY KEY,
            emprestimo_id INTEGER NOT NULL,
            valor_pago REAL NOT NULL,
            data_pagamento TEXT NOT NULL,
            FOREIGN KEY (emprestimo_id) REFERENCES emprestimos(id)
        );

        CREATE TABLE faturas (
            id INTEGER PRIMARY KEY,
            cliente TEXT NOT NULL,
            valor_em_aberto REAL NOT NULL,
            status TEXT NOT NULL,
            data_vencimento TEXT NOT NULL
        );

        CREATE TABLE transacoes_cartao (
            id INTEGER PRIMARY KEY,
            cartao TEXT NOT NULL,
            cliente TEXT NOT NULL,
            valor REAL NOT NULL,
            status TEXT NOT NULL,
            data_transacao TEXT NOT NULL
        );
        """
    )
    insert_many(connection, "clientes", ("id", "nome", "segmento"), [(1, "Loja Norte", "PME"), (2, "Mercado Sul", "PME"), (3, "Ana Pereira", "Pessoa Física"), (4, "Grupo Orion", "Corporate"), (5, "Beta Serviços", "PME"), (6, "Carlos Souza", "Pessoa Física")])
    insert_many(connection, "emprestimos", ("cliente_id", "valor_contratado", "status", "classificacao_risco"), [(1, 120000.0, "ativo", "alto"), (2, 130000.0, "ativo", "crítico"), (3, 90000.0, "ativo", "alto"), (4, 100000.0, "ativo", "crítico"), (5, 50000.0, "ativo", "médio"), (6, 70000.0, "quitado", "alto")])
    insert_many(connection, "pagamentos", ("emprestimo_id", "valor_pago", "data_pagamento"), [(1, 30000.0, "2026-04-05"), (1, 10000.0, "2026-05-03"), (2, 28000.0, "2026-04-12"), (3, 2500.0, "2026-03-20"), (4, 26000.0, "2026-04-25"), (5, 10000.0, "2026-04-11"), (6, 70000.0, "2026-04-01")])
    insert_many(connection, "faturas", ("cliente", "valor_em_aberto", "status", "data_vencimento"), [("Grupo Alameda", 18400.0, "vencida", "2026-04-10"), ("Clínica Norte", 12750.5, "vencida", "2026-04-18"), ("Mercado Azul", 9200.0, "vencida", "2026-03-29"), ("Studio Prisma", 6100.0, "vencida", "2026-04-25"), ("Oficina Central", 4400.75, "vencida", "2026-02-14"), ("Padaria Sol", 3900.0, "vencida", "2026-04-28"), ("Loja Horizonte", 25000.0, "aberta", "2026-04-22"), ("Tech Vila", 30000.0, "vencida", "2026-05-03")])
    insert_many(connection, "transacoes_cartao", ("cartao", "cliente", "valor", "status", "data_transacao"), [("**** 8842", "Marina Costa", 4000.00, "negada", "2026-05-04"), ("**** 8842", "Marina Costa", 5200.00, "negada", "2026-05-18"), ("**** 1920", "Rafael Nunes", 3000.50, "negada", "2026-05-08"), ("**** 1920", "Rafael Nunes", 3100.00, "negada", "2026-05-19"), ("**** 4311", "Bianca Alves", 1800.00, "negada", "2026-05-12"), ("**** 7750", "João Mendes", 599.00, "negada", "2026-05-22"), ("**** 8842", "Marina Costa", 7000.00, "aprovada", "2026-05-20"), ("**** 4311", "Bianca Alves", 5000.00, "negada", "2026-06-02")])
    connection.commit()
    connection.close()


def main() -> None:
    seed_saude()
    seed_tecnologia()
    seed_esporte()
    seed_industria()
    seed_educacao()
    seed_arte()
    seed_agricultura()
    seed_logistica()
    seed_games()
    seed_financas()
    print(f"Bancos criados em {DATABASES_DIR}")


if __name__ == "__main__":
    main()
