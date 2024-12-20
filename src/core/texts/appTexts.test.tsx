import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { IAltinnOrg, IAltinnOrgs } from 'src/types/shared';

function AppTextsRenderer() {
  const appName = useAppName();
  const appOwner = useAppOwner();
  return (
    <>
      <div data-testid='appName'>{appName}</div>
      <div data-testid='appOwner'>{appOwner}</div>
    </>
  );
}

interface RenderProps {
  textResources?: IRawTextResource[];
  applicationMetadata?: ApplicationMetadata;
  orgs?: IAltinnOrgs;
  nbTitle?: string;
}

async function render({ nbTitle, textResources = [], orgs = {} }: RenderProps) {
  const overrides = nbTitle ? { title: { nb: nbTitle } } : {};
  jest.mocked(fetchApplicationMetadata).mockImplementation(async () => getIncomingApplicationMetadataMock(overrides));

  return await renderWithoutInstanceAndLayout({
    renderer: () => <AppTextsRenderer />,
    queries: {
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
      await render({ nbTitle: 'SomeAppName' });

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
        nbTitle: 'AppNameFromMetadata',
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
        nbTitle: 'AppNameFromMetadata',
      });

      expect(screen.getByTestId('appName')).toHaveTextContent('AppNameFromTextResource');
    });

    it('should fall back to nb-key from appMetadata if userLanguage is not present in application.title and no text resources exist', async () => {
      await render({
        nbTitle: 'NorwegianName',
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
