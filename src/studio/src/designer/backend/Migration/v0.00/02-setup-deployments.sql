-- Procedure: insert_deployment

CREATE OR REPLACE PROCEDURE designer.insert_deployment(
	id character varying,
	tagName character varying,
	org character varying,
	app character varying,
  buildId character varying,
  buildResult character varying,
  created timestamp with time zone,
	entity text)
LANGUAGE 'plpgsql'
AS $BODY$
DECLARE createdTime timestamptz; 
BEGIN
  SET TIME ZONE UTC;

  INSERT INTO designer.deployments(id, tagName, org, app, buildId, buildResult, created, entity)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

END;
$BODY$;

CREATE OR REPLACE FUNCTION designer.get_deployments(
	_org character varying,
	_app character varying,
	_limit int,
	_order_asc_desc character varying)
    RETURNS TABLE(deployments text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.deployments.entity
  FROM designer.deployments
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

CREATE OR REPLACE FUNCTION designer.get_deployment(
	_org character varying,
	_buildId character varying)
    RETURNS TABLE(deployments text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.deployments.entity
  FROM designer.deployments
  WHERE org = _org AND buildId = _buildId;
END;
$BODY$;

CREATE OR REPLACE PROCEDURE designer.update_deployment_build(
	_id character varying,
  _buildResult character varying,
	_entity text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
  UPDATE designer.deployments
  SET buildResult = _buildResult,
      entity = _entity
  WHERE id = _id;
END;
$BODY$;
