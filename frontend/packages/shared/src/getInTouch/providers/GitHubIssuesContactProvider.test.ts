import { GitHubIssueContactProvider } from 'app-shared/getInTouch/providers/GitHubIssueContactProvider';

describe('GitHubIssuesContactProvider', () => {
  it('should return correct link based on selected issue type', () => {
    const gitHubIssuesContactProvider = new GitHubIssueContactProvider();
    expect(gitHubIssuesContactProvider.buildContactUrl('featureRequest')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?assignees=&labels=kind/feature-request,status/triage&projects=&template=feature_request.yml',
    );

    expect(gitHubIssuesContactProvider.buildContactUrl('bugReport')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?assignees=&labels=kind/bug,status/triage&projects=&template=bug_report.yml',
    );
  });
});
