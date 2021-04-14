CREATE OR REPLACE PROCEDURE events.setvalidsubscription(_id integer)
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  UPDATE 
	events.subscription s
  WHERE s.id = _id
  SET
  s.validated = true;
END;
$BODY$;
