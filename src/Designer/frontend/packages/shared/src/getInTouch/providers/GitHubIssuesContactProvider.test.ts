import { GitHubIssueContactProvider } from 'app-shared/getInTouch/providers/GitHubIssueContactProvider';

describe('GitHubIssuesContactProvider', () => {
  it('should return correct link based on selected issue type', () => {
    const gitHubIssuesContactProvider = new GitHubIssueContactProvider();
    expect(gitHubIssuesContactProvider.buildContactUrl('featureRequest')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?labels=kind/feature-request,status/triage&template=feature_request.yml',
    );

    expect(gitHubIssuesContactProvider.buildContactUrl('bugReport')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?labels=kind/bug,status/triage&template=bug_report.yml',
    );

    expect(gitHubIssuesContactProvider.buildContactUrl('choose')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new/choose',
    );
  });

  it('should support options to prefill form', () => {
    const gitHubIssuesContactProvider = new GitHubIssueContactProvider();
    expect(
      gitHubIssuesContactProvider.buildContactUrl('bugReport', {
        title: 'title of the issue',
        'additional-information': 'cannot read property of undefined, reading id',
      }),
    ).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?labels=kind/bug,status/triage&template=bug_report.yml&title=title%20of%20the%20issue&additional-information=cannot%20read%20property%20of%20undefined%2C%20reading%20id',
    );
  });
});
