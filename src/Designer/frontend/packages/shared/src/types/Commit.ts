export interface Commit {
  message: string;
  author: CommitAuthor;
  committer: CommitAuthor;
  sha: string;
  messageShort: string;
  encoding: string;
}

export interface CommitAuthor {
  email: string;
  name: string;
  when: Date;
}
