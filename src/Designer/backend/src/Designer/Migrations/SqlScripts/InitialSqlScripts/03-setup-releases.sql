-- Procedure: insert_release

CREATE OR REPLACE PROCEDURE designer.insert_release(
	buildid character varying,
	tagname character varying,
	org character varying,
	app character varying,
  buildstatus character varying,
  buildresult character varying,
  created timestamp with time zone,
	entity text)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE createdTime timestamptz; 
BEGIN
  SET TIME ZONE UTC;

  INSERT INTO designer.releases(buildid, tagname, org, app, buildstatus, buildresult, created, entity)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

END;
$BODY$;

CREATE OR REPLACE FUNCTION designer.get_releases(
	_org character varying,
	_app character varying,
	_limit int,
	_order_asc_desc character varying)
    RETURNS TABLE(releases text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.releases.entity
  FROM designer.releases
  WHERE org = _org AND app = _app
  ORDER BY
    CASE WHEN _order_asc_desc = 'asc' THEN
      created
      END
    ASC,
    CASE WHEN _order_asc_desc = 'desc' THEN
      created
      END
    DESC
  LIMIT _limit;
END;
$BODY$; 	

CREATE OR REPLACE FUNCTION designer.get_release(
	_org character varying,
	_buildid character varying)
    RETURNS TABLE(releases text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.releases.entity
  FROM designer.releases
  WHERE org = _org AND buildid = _buildid;
END;
$BODY$;

CREATE OR REPLACE FUNCTION designer.check_existing_release(
	_org character varying,
	_app character varying,
	_tagname character varying,
	_buildstatus text[],
  _buildresult text[])
    RETURNS TABLE(releases text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.releases.entity
  FROM designer.releases
  WHERE org = _org 
  AND app = _app 
  AND tagname = _tagname
  AND ((_buildstatus IS NOT NULL AND releases.buildstatus ILIKE ANY(_buildstatus)) OR (_buildresult IS NOT NULL AND releases.buildresult ILIKE ANY(_buildresult)));
END;
$BODY$;

CREATE OR REPLACE PROCEDURE designer.update_release_build(
  _org character varying,
	_buildid character varying,
  _buildstatus character varying,
  _buildresult character varying,
	_entity text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
  UPDATE designer.releases
  SET buildstatus = _buildstatus,
      buildresult = _buildresult,
      entity = _entity
  WHERE org = _org AND buildid = _buildid;
END;
$BODY$;