import React from 'react';

import { screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { IAltinnOrg, IAltinnOrgs } from 'src/types/shared';

function AppTextsRenderer() {
  const appName = useAppName();
  const appOwner = useAppOwner();
  return (
    <>
      <div data-testid={'appName'}>{appName}</div>
      <div data-testid={'appOwner'}>{appOwner}</div>
    </>
  );
}

interface RenderProps {
  textResources?: IRawTextResource[];
  applicationMetadata?: IApplicationMetadata;
  orgs?: IAltinnOrgs;
}

async function render({
  textResources = [],
  applicationMetadata = getApplicationMetadataMock(),
  orgs = {},
}: RenderProps) {
  return await renderWithoutInstanceAndLayout({
    renderer: () => <AppTextsRenderer />,
    queries: {
      fetchApplicationMetadata: async () => applicationMetadata,
      fetchTextResources: async () => ({
        language: 'nb',
        resources: textResources,
      }),
      fetchOrgs: async () => ({ orgs }),
    },
  });
}

describe('appTexts', () => {
  describe('useAppName', () => {
    it('should return app name if defined by appName key', async () => {
      await render({
        textResources: [
          {
            id: 'appName',
            value: 'SomeAppName',
          },
        ],
      });
      expect(screen.getByTestId('appName')).toHaveTextContent('SomeAppName');
    });

    it('should return app name if defined by ServiceName key', async () => {
      await render({
        textResources: [
          {
            id: 'ServiceName',
            value: 'SomeAppName',
          },
        ],
      });

      expect(screen.getByTestId('appName')).toHaveTextContent('SomeAppName');
    });

    it('should return appName if defined in applicationMetadata and not by text resource keys', async () => {
      await render({
        applicationMetadata: {
          ...getApplicationMetadataMock(),
          title: {
            nb: 'SomeAppName',
          },
        },
      });

      expect(screen.getByTestId('appName')).toHaveTextContent('SomeAppName');
    });

    it('should return app name defined by appName key even if applicationMetadata definition exist', async () => {
      await render({
        textResources: [
          {
            id: 'appName',
            value: 'AppNameFromTextResource',
          },
        ],
        applicationMetadata: {
          ...getApplicationMetadataMock(),
          title: {
            nb: 'AppNameFromMetadata',
          },
        },
      });

      expect(screen.getByTestId('appName')).toHaveTextContent('AppNameFromTextResource');
    });

    it('should return app name defined by ServiceName key even if applicationMetadata definition exist', async () => {
      await render({
        textResources: [
          {
            id: 'ServiceName',
            value: 'AppNameFromTextResource',
          },
        ],
        applicationMetadata: {
          ...getApplicationMetadataMock(),
          title: {
            nb: 'AppNameFromMetadata',
          },
        },
      });

      expect(screen.getByTestId('appName')).toHaveTextContent('AppNameFromTextResource');
    });

    it('should fall back to nb-key from appMetadata if userLanguage is not present in application.title and no text resources exist', async () => {
      await render({
        applicationMetadata: {
          ...getApplicationMetadataMock(),
          title: {
            nb: 'NorwegianName',
          },
        },
      });

      expect(screen.getByTestId('appName')).toHaveTextContent('NorwegianName');
    });
  });

  describe('useAppOwner', () => {
    it('should return app owner if defined by appOwner key', async () => {
      await render({
        textResources: [
          {
            id: 'appOwner',
            value: 'NameFromResources',
          },
        ],
        orgs: {
          ttd: {
            name: { nb: 'NameFromOrg' },
          } as unknown as IAltinnOrg,
        },
      });

      expect(screen.getByTestId('appOwner')).toHaveTextContent('NameFromResources');
    });

    it('should fall back on altinn-orgs if no text resource is defined', async () => {
      await render({
        orgs: {
          mockOrg: {
            name: { nb: 'NameFromOrg' },
          } as unknown as IAltinnOrg,
        },
      });

      expect(screen.getByTestId('appOwner')).toHaveTextContent('NameFromOrg');
    });

    it('should return undefined value is not set by appOwner key and no text defined in org', async () => {
      await render({});
      expect(screen.getByTestId('appOwner')).toHaveTextContent('');
    });
  });
});
