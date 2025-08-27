export type CreateReleasePayload = {
  tagName: string;
  name: string;
  body: string;
  targetCommitish: string;
};
