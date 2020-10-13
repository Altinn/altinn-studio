-- SCHEMA: events

CREATE SCHEMA IF NOT EXISTS events
AUTHORIZATION platform_events_admin;

-- Table: events.events

CREATE TABLE IF NOT EXISTS events.events
(
    sequenceno BIGSERIAL,
    id character varying COLLATE pg_catalog."default" NOT NULL,
    source character varying COLLATE pg_catalog."default" NOT NULL,
    subject character varying COLLATE pg_catalog."default" NOT NULL,
    "time" timestamptz  NOT NULL,
    type character varying COLLATE pg_catalog."default" NOT NULL,
    cloudevent text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT events_pkey PRIMARY KEY (sequenceno)
)

TABLESPACE pg_default;

-- Procecure: insert_event

CREATE OR REPLACE PROCEDURE events.insert_event(
	id character varying,
	source character varying,
	subject character varying,
	type character varying,
	cloudevent text)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE currentTime timestamptz; 
DECLARE currentTimeString character varying; 
BEGIN
  SET TIME ZONE UTC;
  currentTime := NOW();
  currentTimeString :=  to_char(currentTime, 'YYYY-MM-DD"T"HH24:MI:SS.USOF');

INSERT INTO events.events(id, source, subject, type, "time", cloudevent)
	VALUES ($1, $2, $3, $4, currentTime,  substring($5 from 1 for length($5) -1)  || ',"time": "' || currentTimeString || '"}');
	
END;
$BODY$;
