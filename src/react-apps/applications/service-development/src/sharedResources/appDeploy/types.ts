export interface IBuild {
  id: string;
}

export interface IDeployment {
  id: string;
  tag_name: string;
  app: string;
  org: string;
  env_name: string;
  created_by: string;
  created: string;
  status: string;
  started: string;
  finished: string;
  build: IBuild;
}
