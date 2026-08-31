export type CodeListFile = OrdinaryCodeListFile | CodeListFileWithProblem;

export type OrdinaryCodeListFile = {
  name: string;
  content: string;
};

export type CodeListFileWithProblem = {
  name: string;
  problem: ProblemDetails;
};

type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
};
