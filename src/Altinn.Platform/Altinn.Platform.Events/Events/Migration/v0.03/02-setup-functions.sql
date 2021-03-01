CREATE OR REPLACE FUNCTION events.getsubscription(_id integer)
    RETURNS TABLE (id bigint, sourcefilter character varying, subjectfilter character varying, typefilter character varying, consumer character varying, endpointurl character varying, createdby character varying, validated BOOLEAN, "time" timestamptz)
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
return query 
	SELECT s.id, s.sourcefilter, s.subjectfilter, s.typefilter, s.consumer, s.endpointurl, s.createdby, s.validated, s."time"
	FROM events.subscription s
  where s.id = _id;

END;
$BODY$;

------------------
CREATE OR REPLACE PROCEDURE events.deletesubscription(_id integer)
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  DELETE 
	FROM events.subscription s
  where s.id = _id;

END;
$BODY$;
