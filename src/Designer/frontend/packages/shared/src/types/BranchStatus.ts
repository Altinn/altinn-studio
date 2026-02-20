export interface Branch {
  name: string;
  commit: {
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
}

export interface BranchStatus {
  commit: {
    author: any; //unused
    committer: any; //unused
    id: string;
  };
  name: string;
}
