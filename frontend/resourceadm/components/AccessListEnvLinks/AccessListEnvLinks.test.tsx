import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { AccessListEnvLinks } from './AccessListEnvLinks';
import { renderWithProviders } from '@studio/testing/wrapper';

const resourceId = 'res1';
const org = 'ttd';

const resourcePublishStatus = {
  policyVersion: null,
  resourceVersion: '1',
  publishedVersions: [
    {
      version: null,
      environment: 'at21',
    },
    {
      version: '1',
      environment: 'at22',
    },
    {
      version: '2',
      environment: 'at23',
    },
    {
      version: null,
      environment: 'at24',
    },
    {
      version: null,
      environment: 'prod',
    },
    {
      version: null,
      environment: 'tt02',
    },
  ],
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: org,
    resourceId: resourceId,
  }),
}));

describe('AccessListEnvLinks', () => {
  afterEach(jest.clearAllMocks);

  it('should show warning when resource is not published in some environments', async () => {
    renderAccessListEnvLinks();

    await screen.findByText(textMock('resourceadm.about_resource_rrr_publish_warning'));
  });

  it('should show buttons for each environment resource is published in', async () => {
    renderAccessListEnvLinks();

    await screen.findByText(
      textMock('resourceadm.about_resource_edit_rrr', {
        env: textMock('resourceadm.deploy_at22_env'),
      }),
    );
    await screen.findByText(
      textMock('resourceadm.about_resource_edit_rrr', {
        env: textMock('resourceadm.deploy_at23_env'),
      }),
    );
  });
});

const renderAccessListEnvLinks = () => {
  const getResourcePublishStatus = jest
    .fn()
    .mockImplementation(() => Promise.resolve(resourcePublishStatus));
  return renderWithProviders(<AccessListEnvLinks />, {
    queries: {
      getResourcePublishStatus: getResourcePublishStatus,
    },
  });
};
