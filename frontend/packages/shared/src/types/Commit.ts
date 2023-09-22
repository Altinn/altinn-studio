export interface Commit {
  message: string;
  author: CommitAuthor;
  comitter: CommitAuthor;
  sha: string;
  messageShort: string;
  encoding: string;
}

export interface CommitAuthor {
  email: string;
  name: string;
  when: Date;
}
