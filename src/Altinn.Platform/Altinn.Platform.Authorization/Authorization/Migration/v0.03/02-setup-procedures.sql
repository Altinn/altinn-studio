-- Function: delegation.get_all_current_changes

CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_offeredbypartyid_only(
	_altinnappids character varying[],
	_offeredbypartyids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
    STABLE PARALLEL SAFE 

AS $BODY$
SELECT
delegationchangeid,
altinnappid,
offeredbypartyid,
coveredbypartyid,
coveredbyuserid,
performedbyuserid,
blobstoragepolicypath,
blobstorageversionid,
isdeleted,
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

-- Function: delegation.get_all_current_changes_coveredbypartyids

CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_coveredbypartyids(
	_altinnappids character varying[],
	_offeredbypartyids integer[],
	_coveredbypartyids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
    STABLE PARALLEL SAFE

AS $BODY$
SELECT
delegationchangeid,
altinnappid,
offeredbypartyid,
coveredbypartyid,
coveredbyuserid,
performedbyuserid,
blobstoragepolicypath,
blobstorageversionid,
isdeleted,
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

-- Function: delegation.get_all_current_changes_coveredbyuserids

CREATE OR REPLACE FUNCTION delegation.get_all_current_changes_coveredbyuserids(
	_altinnappids character varying[],
	_offeredbypartyids integer[],
	_coveredbyuserids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
    STABLE PARALLEL SAFE 

AS $BODY$
SELECT
delegationchangeid,
altinnappid,
offeredbypartyid,
coveredbypartyid,
coveredbyuserid,
performedbyuserid,
blobstoragepolicypath,
blobstorageversionid,
isdeleted,
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
