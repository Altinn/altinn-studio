-- SCHEMA: designer

CREATE SCHEMA IF NOT EXISTS designer
AUTHORIZATION designer_admin;

GRANT  USAGE  ON SCHEMA designer TO designer;

-- Table: designer.deployments

CREATE TABLE IF NOT EXISTS designer.deployments
(
    sequenceno BIGSERIAL,
    id character varying COLLATE pg_catalog."default" NOT NULL,
    tagName character varying COLLATE pg_catalog."default" NOT NULL,
    org character varying COLLATE pg_catalog."default" NOT NULL,
    app character varying COLLATE pg_catalog."default" NOT NULL,
    buildId character varying COLLATE pg_catalog."default" NOT NULL,
    buildResult character varying COLLATE pg_catalog."default" NOT NULL,
    created timestamptz  NOT NULL,
    entity text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT deployments_pkey PRIMARY KEY (sequenceno)
)

TABLESPACE pg_default;



-- Table: designer.releases

CREATE TABLE IF NOT EXISTS designer.releases
(
    sequenceno BIGSERIAL,
    id character varying COLLATE pg_catalog."default" NOT NULL,
    tagName character varying COLLATE pg_catalog."default" NOT NULL,
    org character varying COLLATE pg_catalog."default" NOT NULL,
    app character varying COLLATE pg_catalog."default" NOT NULL,
    buildId character varying COLLATE pg_catalog."default" NOT NULL,
    buildStatus character varying COLLATE pg_catalog."default" NOT NULL,
    buildResult character varying COLLATE pg_catalog."default" NOT NULL,
    created timestamptz  NOT NULL,
    entity text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT releases_pkey PRIMARY KEY (sequenceno)
)

TABLESPACE pg_default;
