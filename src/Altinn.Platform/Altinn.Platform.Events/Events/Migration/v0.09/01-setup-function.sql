CREATE OR REPLACE FUNCTION events.insertevent(
	id character varying,
	source character varying,
	subject character varying,
	type character varying,
	cloudevent INOUT text)
    LANGUAGE 'plpgsql'
    
AS $BODY$
  DECLARE currentTime timestamptz;
  DECLARE currentTimeString character varying;
  DECLARE finalCloudEvent text;

  BEGIN
    SET TIME ZONE UTC;
    currentTime := NOW();
    currentTimeString :=  to_char(currentTime, 'YYYY-MM-DD"T"HH24:MI:SS.USOF');

  finalCloudEvent:= substring($5 from 1 for length($5) -1)  || ',"time": "' || currentTimeString || '"}';

  INSERT INTO events.events(id, source, subject, type, "time", cloudevent)
	  VALUES ($1, $2, $3, $4, currentTime,  finalCloudEvent);

  SELECT finalCloudEvent
  INTO cloudevent;

  END;
$BODY$;
