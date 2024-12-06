import { EmailContactProvider } from 'app-shared/getInTouch/providers/EmailContactProvider';

describe('EmailContactProvider', () => {
  it('should return correct email based on selectedChannel', () => {
    const emailContactProvider = new EmailContactProvider();

    expect(emailContactProvider.buildContactUrl('serviceOwner')).toBe(
      'mailto:tjenesteeier@altinn.no',
    );
    expect(emailContactProvider.buildContactUrl('serviceDesk')).toBe(
      'mailto:servicedesk@altinn.no',
    );
  });
});
