import type {
  ApplicationMetadata,
  CopyInstanceSettings,
  HideSettings,
  MessageBoxConfig,
  OnEntry,
  PartyTypesAllowed,
} from 'app-shared/types/ApplicationMetadata';

const mockValidFrom: string = '2023-10-13T12:00:00Z';
const mockValidTo: string = '2023-11-13T12:00:00Z';

const mockPartyTypesAllowed: PartyTypesAllowed = {
  bankruptcyEstate: true,
  organisation: false,
  person: false,
  subUnit: false,
};

const mockHideSettings: HideSettings = {
  hideAlways: true,
};

const mockMessageBoxConfig: MessageBoxConfig = {
  hideSettings: mockHideSettings,
};

const mockCopyInstanceSettings: CopyInstanceSettings = {
  enabled: true,
};

const mockOnEntry: OnEntry = {
  show: 'select-instance',
};

export const mockAppMetadata: ApplicationMetadata = {
  id: 'mockId',
  org: 'org',
  partyTypesAllowed: mockPartyTypesAllowed,
  validFrom: mockValidFrom,
  validTo: mockValidTo,
  autoDeleteOnProcessEnd: true,
  messageBoxConfig: mockMessageBoxConfig,
  copyInstanceSettings: mockCopyInstanceSettings,
  onEntry: mockOnEntry,
};
