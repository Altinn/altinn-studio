-- Procecure: insert_change
CREATE OR REPLACE PROCEDURE delegation.insert_change(
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer,
  _performedByUserId integer,
  _blobStoragePolicyPath character varying,
  _blobStorageVersionId character varying,
  _isDeleted bool,
  inout _delegationChangeId bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO delegation.delegationChanges (
    altinnAppId, 
    offeredByPartyId,
    coveredByUserId,
    coveredByPartyId,
    performedByUserId,
    blobStoragePolicyPath,
    blobStorageVersionId,
    isDeleted
)
VALUES (
  _altinnAppId,
  _offeredByPartyId,
  _coveredByUserId,
  _coveredByPartyId,
  _performedByUserId,
  _blobStoragePolicyPath,
  _blobStorageVersionId,
  _isDeleted
) RETURNING delegationChangeId INTO _delegationChangeId;

END;
$BODY$;


-- Function: get_current_change
CREATE OR REPLACE FUNCTION delegation.get_current_change(
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer
)
RETURNS SETOF delegation.delegationChanges AS 
$BODY$
  SELECT
    delegationChangeId,
    altinnAppId, 
    offeredByPartyId,
    coveredByUserId,
    coveredByPartyId,
    performedByUserId,
    blobStoragePolicyPath,
    blobStorageVersionId,
    isDeleted,
    created
  FROM delegation.delegationChanges
  WHERE
    altinnAppId = _altinnAppId
    AND offeredByPartyId = _offeredByPartyId
    AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
    AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
  ORDER BY delegationChangeId DESC LIMIT 1
$BODY$
LANGUAGE sql;


-- Function: get_all_changes
CREATE OR REPLACE FUNCTION delegation.get_all_changes(
  IN _altinnAppId character varying,
  IN _offeredByPartyId integer,
  IN _coveredByUserId integer,
  IN _coveredByPartyId integer
)
RETURNS SETOF delegation.delegationChanges AS
$BODY$
  SELECT
    delegationChangeId,
    altinnAppId, 
    offeredByPartyId,
    coveredByUserId,
    coveredByPartyId,
    performedByUserId,
    blobStoragePolicyPath,
    blobStorageVersionId,
    isDeleted,
    created
  FROM delegation.delegationChanges
  WHERE
  altinnAppId = _altinnAppId
  AND offeredByPartyId = _offeredByPartyId
  AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
  AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
$BODY$
LANGUAGE sql;
