CREATE OR REPLACE FUNCTION events.get(
	_subject character varying,
	_after character varying,
	_from timestamp with time zone,
	_to timestamp with time zone,
	_type text[],
	_source text[])
    RETURNS TABLE(cloudevents text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
return query 
	Select events.events.cloudevent
	from events.events
	WHERE (_subject = '' OR events.subject = _subject)	
	AND (_from IS NULL OR events.time >= _from)
	AND (_to IS NULL OR events.time <= _to)
	AND (_type IS NULL OR events.type ILIKE ANY(_type) )
	AND (_source IS NULL OR events.source ILIKE ANY(_source))
	AND (_after = '' OR events.sequenceno >(
		SELECT 
			case count(*)
			when 0
				then 0
			else 
				(SELECT sequenceno
				FROM events.events
				WHERE id = _after) 
			end 
		FROM events.events
		WHERE id = _after));
END;
$BODY$;
