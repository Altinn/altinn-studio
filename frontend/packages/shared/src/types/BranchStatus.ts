export interface BranchStatus {
  commit: {
    author: any; //unused
    committer: any; //unused
    id: string;
  };
  name: string;
}
