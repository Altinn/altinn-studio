-- SCHEMA: events

CREATE SCHEMA IF NOT EXISTS events
    AUTHORIZATION postgres;

-- Table: events.events

CREATE TABLE IF NOT EXISTS events.events
(
    sequenceno BIGSERIAL,
    id character varying COLLATE pg_catalog."default" NOT NULL,
    source character varying COLLATE pg_catalog."default" NOT NULL,
    subject character varying COLLATE pg_catalog."default" NOT NULL,
    "time" timestamptz  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type character varying COLLATE pg_catalog."default" NOT NULL,
    cloudevent text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT events_pkey PRIMARY KEY (sequenceno)
)

TABLESPACE pg_default;

ALTER TABLE events.events
    OWNER to postgres;

-- Procecure: insert_event

CREATE OR REPLACE PROCEDURE events.insert_event(
	id character varying,
	source character varying,
	subject character varying,
	type character varying,
	cloudevent text)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE currentTime timestamptz := current_timestamp;
BEGIN

INSERT INTO events.events(id, source, subject, type, "time", cloudevent)
	VALUES ($1, $2, $3, $4, currentTime,  substring($5 from 1 for length($5) -1)  || ', "time": "' || currentTime || '"}');
	
END;
$BODY$;
