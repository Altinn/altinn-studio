-- Procecure: insert_change
CREATE OR REPLACE PROCEDURE delegation.insert_change(
	_altinnappid character varying,
	_offeredbypartyid integer,
	_coveredbyuserid integer,
	_coveredbypartyid integer,
	_performinguserid integer,
	_blobstoragepolicypath character varying,
	_blobstorageversionid character varying,
	_isDeleted boolean,
	INOUT _policychangeid bigint)
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
INSERT INTO delegation.delegatedPolicy(
    altinnAppId, 
    offeredByPartyId, coveredByUserId, coveredByPartyId, performingUserId,
    blobStoragePolicyPath, blobStorageVersionId, isDeleted
)
VALUES (
  _altinnAppId,
  _offeredByPartyId, _coveredByUserId, _coveredByPartyId, _performingUserId,
  _blobStoragePolicyPath, _blobStorageVersionId, _isDeleted
) RETURNING policyChangeId INTO _policyChangeId;

END;
$BODY$;
