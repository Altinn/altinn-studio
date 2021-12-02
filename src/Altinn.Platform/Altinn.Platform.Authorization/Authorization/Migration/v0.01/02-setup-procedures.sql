-- Function: get_all_current_changes
CREATE OR REPLACE FUNCTION delegation.get_all_current_changes(
	_altinnappids character varying[],
	_offeredbypartyids integer[],
	_coveredbypartyids integer[],
	_coveredbyuserids integer[])
    RETURNS SETOF delegation.delegationchanges 
    LANGUAGE 'sql'
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
		  AND (_offeredbypartyids IS NULL OR offeredByPartyId = ANY (_offeredByPartyIds))
		  AND (_coveredbypartyids IS NULL OR (coveredByPartyId IS NULL OR coveredByPartyId = ANY (_coveredByPartyIds)))
		  AND (_coveredbyuserids IS NULL OR (coveredByUserId IS NULL OR coveredByUserId = ANY (_coveredByUserIds)))
		GROUP BY altinnAppId, offeredByPartyId, coveredByPartyId, coveredByUserId
	) AS selectMaxChange
	ON delegationChangeId = selectMaxChange.maxChange
$BODY$;
