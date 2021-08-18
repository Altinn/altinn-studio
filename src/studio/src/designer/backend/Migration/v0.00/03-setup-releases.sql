-- Procedure: insert_release

CREATE OR REPLACE PROCEDURE designer.insert_release(
	id character varying,
	tagName character varying,
	org character varying,
	app character varying,
  buildId character varying,
  buildStatus character varying,
  buildResult character varying,
  created character varying,
	entity text)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE createdTime timestamptz; 
BEGIN
  SET TIME ZONE UTC;
  createdTime := to_timestamp(created, 'YYYY-MM-DD"T"HH24:MI:SS.USOF');

  INSERT INTO designer.releases(id, tagName, org, app, buildId, buildStatus, buildResult, created, entity)
    VALUES ($1, $2, $3, $4, $5, $6, $7, createdTime, $8);

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
	_buildId character varying)
    RETURNS text 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  SELECT designer.releases.entity
  FROM designer.releases
  WHERE org = _org AND buildId = _buildId;
END;
$BODY$;

CREATE OR REPLACE FUNCTION designer.check_existing_release(
	_org character varying,
	_app character varying,
	_tagName character varying,
	_buildStatus text[],
  _buildResult text[])
    RETURNS TABLE(releases text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.releases.entity
  FROM designer.releases
  WHERE org = _org 
  AND app = _app 
  AND tagName = _tagName
  AND ((_buildStatus IS NOT NULL AND releases.buildStatus ILIKE ANY(_buildStatus)) OR (_buildResult IS NOT NULL AND releases.buildResult ILIKE ANY(_buildResult)));
END;
$BODY$;

CREATE OR REPLACE PROCEDURE designer.update_release_build(
	_id character varying,
  _buildStatus character varying,
  _buildResult character varying,
	_entity text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
  UPDATE designer.releases
  SET buildStatus = _buildStatus,
      buildResult = _buildResult,
      entity = _entity
  WHERE id = _id;
END;
$BODY$;