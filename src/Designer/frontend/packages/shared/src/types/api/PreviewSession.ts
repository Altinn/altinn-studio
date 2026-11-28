/** A preview session, which shows the developer's working copy of an app on the preview service's domain. */
export type PreviewSession = {
  /** The app's root in the session. It holds the session's secret ID. */
  url: string;
};

/** Whom the user in preview acts for: themself, a person, or an organization. A session acts for one of them. */
export type PreviewParty = 'person' | 'organization';

/** An instance in a preview session. */
export type PreviewSessionInstance = {
  /** The instance's ID, `{partyId}/{instanceGuid}`, as the app frontend's URLs have it. */
  instanceId: string;
};
