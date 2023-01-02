-- Procedure: insert_deployment

CREATE OR REPLACE PROCEDURE designer.insert_deployment(
  buildid character varying,
	tagname character varying,
	org character varying,
	app character varying,
  buildresult character varying,
  created timestamp with time zone,
	entity text)
LANGUAGE 'plpgsql'
AS $BODY$ 
BEGIN
  SET TIME ZONE UTC;

  INSERT INTO designer.deployments(buildid, tagname, org, app, buildresult, created, entity)
    VALUES ($1, $2, $3, $4, $5, $6, $7);

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
	_buildid character varying)
    RETURNS TABLE(deployments text) 
    LANGUAGE 'plpgsql'
    
AS $BODY$
BEGIN
  RETURN QUERY
  SELECT designer.deployments.entity
  FROM designer.deployments
  WHERE org = _org AND buildid = _buildid;
END;
$BODY$;

CREATE OR REPLACE PROCEDURE designer.update_deployment_build(
  _org character varying,
	_buildid character varying,
  _buildresult character varying,
	_entity text)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
  UPDATE designer.deployments
  SET buildresult = _buildresult,
      entity = _entity
  WHERE org = _org AND buildid = _buildid;
END;
$BODY$;
