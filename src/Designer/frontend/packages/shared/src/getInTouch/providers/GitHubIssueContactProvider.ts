import { type GetInTouchProvider, type Options } from '../interfaces/GetInTouchProvider';

type BugReportFields = 'title' | 'steps-to-reproduce' | 'additional-information';
type FeatureRequestFields = 'title' | 'description' | 'additional-information';

type GitHubIssueContactOptions = Options<BugReportFields | FeatureRequestFields, string>;

type GitHubIssueTypes = 'featureRequest' | 'bugReport' | 'choose';
type MappableGithubTypes = Exclude<GitHubIssueTypes, 'choose'>;

type GitHubChannelConfig = {
  labels: Array<string>;
  template: string;
};

const gitHubIssueType: Record<MappableGithubTypes, GitHubChannelConfig> = {
  featureRequest: {
    labels: ['kind/feature-request', 'status/triage'],
    template: 'feature_request.yml',
  },
  bugReport: {
    labels: ['kind/bug', 'status/triage'],
    template: 'bug_report.yml',
  },
};

export class GitHubIssueContactProvider
  implements GetInTouchProvider<GitHubIssueTypes, GitHubIssueContactOptions>
{
  private readonly githubRepoUrl: string = 'https://github.com/Altinn/altinn-studio';
  private readonly githubIssueUrl: string = `${this.githubRepoUrl}/issues/new`;

  public buildContactUrl(
    selectedIssueType: GitHubIssueTypes,
    options?: GitHubIssueContactOptions,
  ): string {
    if (selectedIssueType === 'choose') return `${this.githubIssueUrl}/${selectedIssueType}`;
    return (
      this.githubIssueUrl + this.optionToUrlParams(gitHubIssueType[selectedIssueType], options)
    );
  }

  private optionToUrlParams(
    selectedConfig: GitHubChannelConfig,
    options?: GitHubIssueContactOptions,
  ): string {
    const labels = selectedConfig.labels.join(',');
    const optionsQueryParams = options ? `&${this.mapOptionsToQueryParams(options)}` : '';
    return `?labels=${labels}&template=${selectedConfig.template}${optionsQueryParams}`;
  }

  private mapOptionsToQueryParams(options: GitHubIssueContactOptions): string {
    return Object.entries(options)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
}
