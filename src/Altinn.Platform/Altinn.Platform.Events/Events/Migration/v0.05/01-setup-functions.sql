CREATE OR REPLACE FUNCTION events.insert_subscription(
    sourcefilter character varying,
    subjectfilter character varying,
    typefilter character varying,
    consumer character varying,
    endpointurl character varying,
    createdby character varying,
    validated boolean)
  RETURNS SETOF events.subscription AS
$BODY$
DECLARE currentTime timestamptz; 
BEGIN
  SET TIME ZONE UTC;
  currentTime := NOW();

  RETURN QUERY
  INSERT INTO events.subscription(sourcefilter, subjectfilter, typefilter, consumer, endpointurl, createdby, "time", validated)
  VALUES ($1, $2, $3, $4, $5, $6, currentTime, $7) RETURNING *;

END
$BODY$ LANGUAGE 'plpgsql';

DROP PROCEDURE IF EXISTS events.insert_subcsription;
