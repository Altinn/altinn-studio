import { useUpdateAppTitle } from './useUpdateAppTitle';
import { mockAppMetadata } from '../../../../../../test/applicationMetadataMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { APP_NAME } from 'app-shared/constants';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

const languageNb = 'nb';

describe('useUpdateAppTitle', () => {
  beforeEach(jest.clearAllMocks);

  it('should update app metadata and text resource for specific language when adding a title', async () => {
    const newAppTitle = 'newAppTitle';
    const useUpdateAppTitleResult = renderHookWithProviders()(() =>
      useUpdateAppTitle(mockAppMetadata),
    ).renderHookResult.result;
    await waitFor(() => {
      useUpdateAppTitleResult.current({ language: languageNb, appTitle: newAppTitle });
    });
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledWith(org, app, {
      ...mockAppMetadata,
      title: { [languageNb]: newAppTitle },
    });
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, languageNb, {
      [APP_NAME]: newAppTitle,
    });
  });

  it('should handle updating title in an existing language', async () => {
    const existingAppTitle = 'existingAppTitle';
    const newAppTitle = 'newAppTitle';
    const useUpdateAppTitleResult = renderHookWithProviders()(() =>
      useUpdateAppTitle({ ...mockAppMetadata, title: { [languageNb]: existingAppTitle } }),
    ).renderHookResult.result;
    await waitFor(() => {
      useUpdateAppTitleResult.current({ language: languageNb, appTitle: newAppTitle });
    });
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledWith(org, app, {
      ...mockAppMetadata,
      title: { [languageNb]: newAppTitle },
    });
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, languageNb, {
      [APP_NAME]: newAppTitle,
    });
  });

  it('should handle adding title in additional language', async () => {
    const appTitleNb = 'appTitleNb';
    const languageSv = 'sv';
    const newAppTitleSv = 'newAppTitleSv';
    const useUpdateAppTitleResult = renderHookWithProviders()(() =>
      useUpdateAppTitle({ ...mockAppMetadata, title: { [languageNb]: appTitleNb } }),
    ).renderHookResult.result;
    await waitFor(() => {
      useUpdateAppTitleResult.current({ language: languageSv, appTitle: newAppTitleSv });
    });
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledWith(org, app, {
      ...mockAppMetadata,
      title: { [languageNb]: appTitleNb, [languageSv]: newAppTitleSv },
    });
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, languageSv, {
      [APP_NAME]: newAppTitleSv,
    });
  });
});
