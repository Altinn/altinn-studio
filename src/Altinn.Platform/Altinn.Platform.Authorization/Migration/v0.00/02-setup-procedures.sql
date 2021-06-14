-- Procecure: insert_delegation
CREATE OR REPLACE PROCEDURE delegatedPolicy.insert_delegation(
	_altinnAppId character varying,	
	_offeredByPartyId integer,
	_coveredByUserId integer,
	_coveredByPartyId integer,
	_performingUserId integer,
	_blobStoragePolicyPath character varying,
	_blobStorageVersionId character varying,
	out _policy_id bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO delegatedPolicy.delegatedPolicy(
    altinnAppId, 
	offeredByPartyId, coveredByUserId, coveredByPartyId, performingUserId,
    blobStoragePolicyPath, blobStorageVersionId
)
VALUES (
	_altinnAppId, 
	_offeredByPartyId, _coveredByUserId, _coveredByPartyId, _performingUserId,
	_blobStoragePolicyPath, _blobStorageVersionId
) RETURNING policyId INTO _policy_id;

END;
$BODY$;


-- Function: get_with_history
CREATE OR REPLACE FUNCTION delegatedPolicy.get_with_history(
	IN _altinnAppId character varying,	
	IN _offeredByPartyId integer,
	IN _coveredByUserId integer,
	IN _coveredByPartyId integer
    )
    RETURNS SETOF delegatedPolicy.delegatedPolicy AS 
$BODY$
	SELECT * FROM delegatedPolicy.delegatedPolicy
	WHERE 
	    altinnAppId = _altinnAppId
	AND offeredByPartyId = _offeredByPartyId
	AND (_offeredByPartyId IS NULL OR offeredByPartyId = _offeredByPartyId)
	AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
	AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
$BODY$
LANGUAGE sql;


-- Function: get_current
CREATE OR REPLACE FUNCTION delegatedPolicy.get_current(
	_altinnAppId character varying,	
	_offeredByPartyId integer,
	_coveredByUserId integer,
	_coveredByPartyId integer
)
RETURNS delegatedPolicy.delegatedPolicy AS 
$BODY$
	SELECT * FROM delegatedPolicy.delegatedPolicy
	WHERE 
	    altinnAppId = _altinnAppId
	AND offeredByPartyId = _offeredByPartyId
	AND (_offeredByPartyId IS NULL OR offeredByPartyId = _offeredByPartyId)
	AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
	AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
	ORDER BY created DESC LIMIT 1
$BODY$
LANGUAGE sql;

-- Function: get_single
CREATE OR REPLACE FUNCTION delegatedPolicy.get_single(
	_policyId bigint
)
RETURNS delegatedPolicy.delegatedPolicy AS 
$BODY$
	SELECT * FROM delegatedPolicy.delegatedPolicy
	WHERE 
	    policyId = _policyId
$BODY$
LANGUAGE sql;
