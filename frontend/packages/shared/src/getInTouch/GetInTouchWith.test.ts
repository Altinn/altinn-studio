import { GetInTouchWith } from 'app-shared/getInTouch/GetInTouchWith';
import {
  EmailContactProvider,
  GitHubIssueContactProvider,
  SlackContactProvider,
} from 'app-shared/getInTouch/providers';

describe('GetInTouchWith', () => {
  it('should be high-level module that support low-level module', () => {
    const contact = new GetInTouchWith(new EmailContactProvider());
    expect(contact.url('serviceOwner')).toBe('mailto:tjenesteeier@altinn.no');
  });

  it('should have the same API regardless of used low-level implementation module', () => {
    const contactByEmail = new GetInTouchWith(new EmailContactProvider());
    const contactBySlack = new GetInTouchWith(new SlackContactProvider());
    const contactByGitHubIssue = new GetInTouchWith(new GitHubIssueContactProvider());

    expect(contactByEmail.url('serviceDesk')).toBe('mailto:servicedesk@altinn.no');
    expect(contactBySlack.url('altinn')).toBe('https://altinn.slack.com');
    expect(contactByGitHubIssue.url('bugReport')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?labels=kind/bug,status/triage&template=bug_report.yml',
    );
  });
});
