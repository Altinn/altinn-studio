export interface IBuild {
  id: string;
  status: string|number;
  result: string|number;
  started: string;
  finished: string;
}

export interface IDeployment {
  id: string;
  tagName: string;
  app: string;
  org: string;
  envName: string;
  createdBy: string;
  created: string;
  build: IBuild;
}

export interface IDeploymentResults {
  results: IDeployment[];
}
