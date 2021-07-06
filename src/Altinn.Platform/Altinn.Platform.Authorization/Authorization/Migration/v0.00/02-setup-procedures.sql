-- Procecure: insert_delegation
CREATE OR REPLACE PROCEDURE delegation.insert_delegation(
	_altinnAppId character varying,	
	_offeredByPartyId integer,
	_coveredByUserId integer,
	_coveredByPartyId integer,
	_performingUserId integer,
	_blobStoragePolicyPath character varying,
	_blobStorageVersionId character varying,
	inout _policy_id bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO delegation.delegatedPolicy(
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
CREATE OR REPLACE FUNCTION delegation.get_with_history(
	IN _altinnAppId character varying,	
	IN _offeredByPartyId integer,
	IN _coveredByUserId integer,
	IN _coveredByPartyId integer
    )
    RETURNS SETOF delegation.delegatedPolicy AS 
$BODY$
	SELECT * FROM delegation.delegatedPolicy
	WHERE 
	    altinnAppId = _altinnAppId
	AND offeredByPartyId = _offeredByPartyId
	AND (_offeredByPartyId IS NULL OR offeredByPartyId = _offeredByPartyId)
	AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
	AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
$BODY$
LANGUAGE sql;


-- Function: get_current
CREATE OR REPLACE FUNCTION delegation.get_current(
	_altinnAppId character varying,	
	_offeredByPartyId integer,
	_coveredByUserId integer,
	_coveredByPartyId integer
)
RETURNS delegation.delegatedPolicy AS 
$BODY$
	SELECT * FROM delegation.delegatedPolicy
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
CREATE OR REPLACE FUNCTION delegation.get_single(
	_policyId bigint
)
RETURNS delegation.delegatedPolicy AS 
$BODY$
	SELECT * FROM delegation.delegatedPolicy
	WHERE 
	    policyId = _policyId
$BODY$
LANGUAGE sql;
