export type Environment = {
  org?: string;
  repo?: string;
};

export class ResourceEnvironment {
  public readonly org: string;
  public readonly repo: string;

  constructor(private environment?: Environment) {
    this.org = this.environment?.org ?? process.env.PLAYWRIGHT_RESOURCES_ORGANIZATION;
    this.repo = this.environment?.repo ?? process.env.PLAYWRIGHT_RESOURCES_REPO_NAME;
  }
}
