CREATE OR REPLACE PROCEDURE events.setvalidsubscription(_id integer)
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  UPDATE 
	events.subscription
	  SET
   validated = true
	WHERE id = _id;
END;
$BODY$;
