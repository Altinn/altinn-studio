import React from 'react';

import { expect, jest } from '@jest/globals';
import { screen } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { OrgName } from 'src/global';

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
  orgName?: OrgName;
  nbTitle?: string;
}

async function render({ nbTitle, textResources = [], orgName }: RenderProps) {
  const overrides = nbTitle ? { title: { nb: nbTitle } } : {};
  jest.mocked(getApplicationMetadata).mockImplementation(() => getApplicationMetadataMock(overrides));

  const savedOrgName = window.altinnAppGlobalData.orgName;
  window.altinnAppGlobalData.orgName = orgName;

  const result = await renderWithoutInstanceAndLayout({
    renderer: () => <AppTextsRenderer />,
    queries: {
      fetchTextResources: async () => ({
        language: 'nb',
        resources: textResources,
      }),
    },
  });

  return {
    ...result,
    cleanup: () => {
      window.altinnAppGlobalData.orgName = savedOrgName;
    },
  };
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
      const { cleanup } = await render({
        textResources: [
          {
            id: 'appOwner',
            value: 'NameFromResources',
          },
        ],
        orgName: { nb: 'NameFromOrg' },
      });

      expect(screen.getByTestId('appOwner')).toHaveTextContent('NameFromResources');
      cleanup();
    });

    it('should fall back on orgName from global data if no text resource is defined', async () => {
      const { cleanup } = await render({
        orgName: { nb: 'NameFromOrg' },
      });

      expect(screen.getByTestId('appOwner')).toHaveTextContent('NameFromOrg');
      cleanup();
    });

    it('should return undefined when appOwner key is not set and no org name in global data', async () => {
      const { cleanup } = await render({});
      expect(screen.getByTestId('appOwner')).toHaveTextContent('');
      cleanup();
    });
  });
});
