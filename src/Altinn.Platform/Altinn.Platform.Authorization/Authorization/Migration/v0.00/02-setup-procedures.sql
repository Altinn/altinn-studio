-- Sequence: policyId
CREATE SEQUENCE policyId START 1;

-- Procecure: insert_new_delegation_policy
CREATE OR REPLACE PROCEDURE delegation.insert_new_delegation_policy(
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer,
  _performingUserId integer,
  _blobStoragePolicyPath character varying,
  _blobStorageVersionId character varying,
  inout _policyId bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO delegation.delegatedPolicy(
    policyId,
    altinnAppId, 
    offeredByPartyId, coveredByUserId, coveredByPartyId, performingUserId,
    blobStoragePolicyPath, blobStorageVersionId
)
VALUES (
  nextval('policyId'),
  _altinnAppId,
  _offeredByPartyId, _coveredByUserId, _coveredByPartyId, _performingUserId,
  _blobStoragePolicyPath, _blobStorageVersionId
) RETURNING policyId INTO _policyId;

END;
$BODY$;


CREATE OR REPLACE PROCEDURE delegation.insert_delegation_policy_change(
  _policyId bigint,
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer,
  _performingUserId integer,
  _blobStoragePolicyPath character varying,
  _blobStorageVersionId character varying,
  inout _policyChangeId bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO delegation.delegatedPolicy(
    policyId,
    altinnAppId,
  offeredByPartyId, coveredByUserId, coveredByPartyId, performingUserId,
    blobStoragePolicyPath, blobStorageVersionId
)
VALUES (
  _policyId,
  _altinnAppId,
  _offeredByPartyId, _coveredByUserId, _coveredByPartyId, _performingUserId,
  _blobStoragePolicyPath, _blobStorageVersionId
) RETURNING policyChangeId INTO _policyChangeId;

END;
$BODY$;


-- Function: get_all_changes
CREATE OR REPLACE FUNCTION delegation.get_all_changes(
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


-- Function: get_current_change
CREATE OR REPLACE FUNCTION delegation.get_current_change(
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

-- Function: get_single_policy_change
CREATE OR REPLACE FUNCTION delegation.get_single_policy_change(
  _policyChangeId bigint
)
RETURNS delegation.delegatedPolicy AS
$BODY$
  SELECT * FROM delegation.delegatedPolicy
  WHERE
      policyChangeId = _policyChangeId
$BODY$
LANGUAGE sql;


-- Function: get_single_policy
CREATE OR REPLACE FUNCTION delegation.get_single_policy(
  _policyId bigint
)
RETURNS delegation.delegatedPolicy AS 
$BODY$
  SELECT * FROM delegation.delegatedPolicy
  WHERE
      policyId = _policyId
$BODY$
LANGUAGE sql;
