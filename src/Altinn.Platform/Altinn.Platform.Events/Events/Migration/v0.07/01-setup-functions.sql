CREATE OR REPLACE FUNCTION events.getsubscriptionsexcludeorgs(source character varying, subject character varying, type character varying)
    RETURNS TABLE (id bigint, sourcefilter character varying, subjectfilter character varying, typefilter character varying, consumer character varying, endpointurl character varying, createdby character varying, validated BOOLEAN, "time" timestamptz)
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
return query 
	SELECT s.id, s.sourcefilter, s.subjectfilter, s.typefilter, s.consumer, s.endpointurl, s.createdby, s.validated, s."time"
	FROM events.subscription s
  WHERE (s.subjectfilter = subject)
  AND (s.sourcefilter = source)
  AND (s.typefilter is NULL OR s.typefilter = type)
  AND s.consumer not LIKE '/org/%'
  AND s.validated = true;

END;
$BODY$;

CREATE OR REPLACE FUNCTION events.getsubscriptionsbyconsumer(_consumer character varying)
    RETURNS TABLE (id bigint, sourcefilter character varying, subjectfilter character varying, typefilter character varying, consumer character varying, endpointurl character varying, createdby character varying, validated BOOLEAN, "time" timestamptz)
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
return query 
	SELECT s.id, s.sourcefilter, s.subjectfilter, s.typefilter, s.consumer, s.endpointurl, s.createdby, s.validated, s."time"
	FROM events.subscription s
  WHERE s.consumer LIKE _consumer
  AND s.validated = true;

END;
$BODY$;
