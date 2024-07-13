import { Contact } from 'app-shared/userFeedback/Contact';
import {
  EmailContactProvider,
  GitHubIssueContactProvider,
  SlackContactProvider,
} from 'app-shared/userFeedback/providers';

describe('Contact', () => {
  it('should be high-level module that support low-level module', () => {
    const contact = new Contact(new EmailContactProvider());
    expect(contact.url('serviceOwner')).toBe('mailto:tjenesteeier@altinn.no');
  });

  it('should have the same API regardless of used low-level implementation module', () => {
    const contactByEmail = new Contact(new EmailContactProvider());
    const contactBySlack = new Contact(new SlackContactProvider());
    const contactByGitHubIssue = new Contact(new GitHubIssueContactProvider());

    expect(contactByEmail.url('serviceDesk')).toBe('mailto:servicedesk@altinn.no');
    expect(contactBySlack.url('altinn')).toBe('https://altinn.slack.com');
    expect(contactByGitHubIssue.url('bugReport')).toBe(
      'https://github.com/Altinn/altinn-studio/issues/new?assignees=&labels=kind/bug,status/triage&projects=&template=bug_report.yml',
    );
  });
});
