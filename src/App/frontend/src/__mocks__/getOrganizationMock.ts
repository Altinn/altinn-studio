import type { IOrganization } from 'src/types/shared';

export const getOrganizationMock = (): IOrganization => ({
  orgNumber: '123456789',
  name: 'Fancy Org',
  unitType: 'unitType',
  telephoneNumber: '12345678',
  mobileNumber: '87654321',
  faxNumber: '18724365',
  emailAddress: 'mail@example.com',
  internetAddress: 'example.com',
  mailingAddress: 'Økern portal',
  mailingPostalCode: '0580',
  mailingPostalCity: 'Oslo',
  businessPostalCode: '0580',
  businessPostalCity: 'Oslo',
});
