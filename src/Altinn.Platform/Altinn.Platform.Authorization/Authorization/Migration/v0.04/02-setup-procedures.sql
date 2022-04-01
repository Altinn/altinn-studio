-- Function: new insert function delegation.insert_delegationchange to replace old stored proc delegation.insert_change
DROP ROUTINE IF EXISTS delegation.insert_change(
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer,
  _performedByUserId integer,
  _blobStoragePolicyPath character varying,
  _blobStorageVersionId character varying,
  _isDeleted bool,
  inout _delegationChangeId bigint);

CREATE OR REPLACE FUNCTION delegation.insert_delegationchange(
  _delegationChangeType delegation.delegationChangeType,
  _altinnappid character varying,
  _offeredbypartyid integer,
  _coveredbyuserid integer,
  _coveredbypartyid integer,
  _performedbyuserid integer,
  _blobstoragepolicypath character varying,
  _blobstorageversionid character varying
)
RETURNS SETOF delegation.delegationchanges 
LANGUAGE 'sql'
VOLATILE
ROWS 1
AS $BODY$
  INSERT INTO delegation.delegationChanges(
    delegationChangeType,
    altinnAppId, 
    offeredByPartyId,
    coveredByUserId,
    coveredByPartyId,
    performedByUserId,
    blobStoragePolicyPath,
    blobStorageVersionId
  )
  VALUES (
    _delegationChangeType,
    _altinnAppId,
    _offeredByPartyId,
    _coveredByUserId,
    _coveredByPartyId,
    _performedByUserId,
    _blobStoragePolicyPath,
    _blobStorageVersionId
  ) RETURNING *;
$BODY$;


-- Function: update get_current_change from including isDeleted to return delegationChangeType
CREATE OR REPLACE FUNCTION delegation.get_current_change(
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer
)
RETURNS SETOF delegation.delegationChanges
LANGUAGE 'sql'
STABLE PARALLEL SAFE
ROWS 1
AS $BODY$
  SELECT
    delegationChangeId,
    delegationChangeType,
    altinnAppId, 
    offeredByPartyId,
    coveredByUserId,
    coveredByPartyId,
    performedByUserId,
    blobStoragePolicyPath,
    blobStorageVersionId,
    created
  FROM delegation.delegationChanges
  WHERE
    altinnAppId = _altinnAppId
    AND offeredByPartyId = _offeredByPartyId
    AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
    AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
  ORDER BY delegationChangeId DESC LIMIT 1
$BODY$;


-- Function: get_all_changes from including isDeleted to return delegationChangeType
CREATE OR REPLACE FUNCTION delegation.get_all_changes(
  _altinnAppId character varying,
  _offeredByPartyId integer,
  _coveredByUserId integer,
  _coveredByPartyId integer
)
RETURNS SETOF delegation.delegationChanges
LANGUAGE 'sql'
STABLE PARALLEL SAFE
AS $BODY$
  SELECT
    delegationChangeId,
    delegationChangeType,
    altinnAppId, 
    offeredByPartyId,
    coveredByUserId,
    coveredByPartyId,
    performedByUserId,
    blobStoragePolicyPath,
    blobStorageVersionId,
    created
  FROM delegation.delegationChanges
  WHERE
    altinnAppId = _altinnAppId
    AND offeredByPartyId = _offeredByPartyId
    AND (_coveredByUserId IS NULL OR coveredByUserId = _coveredByUserId)
    AND (_coveredByPartyId IS NULL OR coveredByPartyId = _coveredByPartyId)
$BODY$;


-- Function: delegation.get_all_current_changes from including isDeleted to return delegationChangeType
CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_offeredbypartyid_only(
  _altinnappids character varying[],
  _offeredbypartyids integer[]
)
RETURNS SETOF delegation.delegationchanges 
LANGUAGE 'sql'
STABLE PARALLEL SAFE 
AS $BODY$
  SELECT
    delegationchangeid,
    delegationChangeType,
    altinnappid,
    offeredbypartyid,
    coveredbypartyid,
    coveredbyuserid,
    performedbyuserid,
    blobstoragepolicypath,
    blobstorageversionid,
    created
  FROM delegation.delegationchanges
	INNER JOIN
	(
		SELECT MAX(delegationChangeId) AS maxChange
	 	FROM delegation.delegationchanges
		WHERE
		  (_altinnappids IS NULL OR altinnAppId = ANY (_altinnAppIds))
		  AND (offeredByPartyId = ANY (_offeredByPartyIds))
		GROUP BY altinnAppId, offeredByPartyId, coveredByPartyId, coveredByUserId
	) AS selectMaxChange
	ON delegationChangeId = selectMaxChange.maxChange
$BODY$;


-- Function: delegation.get_all_current_changes_coveredbypartyids from including isDeleted to return delegationChangeType
CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_coveredbypartyids(
  _altinnappids character varying[],
  _offeredbypartyids integer[],
  _coveredbypartyids integer[]
)
RETURNS SETOF delegation.delegationchanges 
LANGUAGE 'sql'
STABLE PARALLEL SAFE
AS $BODY$
  SELECT
    delegationchangeid,
    delegationChangeType,
    altinnappid,
    offeredbypartyid,
    coveredbypartyid,
    coveredbyuserid,
    performedbyuserid,
    blobstoragepolicypath,
    blobstorageversionid,
    created
  FROM delegation.delegationchanges
    INNER JOIN
    (
	  SELECT MAX(delegationChangeId) AS maxChange
	  FROM delegation.delegationchanges
	  WHERE
	    (_altinnappids IS NULL OR altinnAppId = ANY (_altinnAppIds))
	    AND (offeredByPartyId = ANY (_offeredByPartyIds))
	    AND coveredByPartyId = ANY (_coveredByPartyIds)
      GROUP BY altinnAppId, offeredByPartyId, coveredByPartyId
    ) AS selectMaxChange
    ON delegationChangeId = selectMaxChange.maxChange
$BODY$;

-- Function: delegation.get_all_current_changes_coveredbyuserids from including isDeleted to return delegationChangeType
CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_coveredbyuserids(
  _altinnappids character varying[],
  _offeredbypartyids integer[],
  _coveredbyuserids integer[]
)
RETURNS SETOF delegation.delegationchanges 
LANGUAGE 'sql'
STABLE PARALLEL SAFE 
AS $BODY$
  SELECT
    delegationchangeid,
    delegationChangeType,
    altinnappid,
    offeredbypartyid,
    coveredbypartyid,
    coveredbyuserid,
    performedbyuserid,
    blobstoragepolicypath,
    blobstorageversionid,
    created
  FROM delegation.delegationchanges
    INNER JOIN
    (
	  SELECT MAX(delegationChangeId) AS maxChange
	  FROM delegation.delegationchanges
	  WHERE
        (_altinnappids IS NULL OR altinnAppId = ANY (_altinnAppIds))
        AND (offeredByPartyId = ANY (_offeredByPartyIds))
        AND coveredByUserId = ANY (_coveredByUserIds)
	  GROUP BY altinnAppId, offeredByPartyId, coveredByUserId
    ) AS selectMaxChange
    ON delegationChangeId = selectMaxChange.maxChange
$BODY$;
