-- Table: events.subscription

CREATE TABLE IF NOT EXISTS events.subscription
(
    id BIGSERIAL,
    sourcefilter character varying COLLATE pg_catalog."default",
    subjectfilter character varying COLLATE pg_catalog."default",
    typefilter character varying COLLATE pg_catalog."default",
    consumer character varying COLLATE pg_catalog."default" NOT NULL,
    endpointurl character varying COLLATE pg_catalog."default" NOT NULL,
    createdby character varying COLLATE pg_catalog."default" NOT NULL,
    validated BOOLEAN NOT NULL,
    "time" timestamptz  NOT NULL,
    CONSTRAINT eventssubscription_pkey PRIMARY KEY (id)
)


TABLESPACE pg_default;

CREATE OR REPLACE PROCEDURE events.insert_subcsription(
	  sourcefilter character varying,
	  subjectfilter character varying,
	  typefilter character varying,
	  consumer character varying,
    endpointurl character varying,
    createdby character varying,
    validated boolean,
    inout subscription_id bigint)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE currentTime timestamptz; 

BEGIN
  SET TIME ZONE UTC;
  currentTime := NOW();

INSERT INTO events.subscription(sourcefilter, subjectfilter, typefilter, consumer, endpointurl, createdby, "time", validated)
	VALUES ($1, $2, $3, $4, $5, $6, currentTime, $7) RETURNING (id) into subscription_id;
END;
$BODY$;

