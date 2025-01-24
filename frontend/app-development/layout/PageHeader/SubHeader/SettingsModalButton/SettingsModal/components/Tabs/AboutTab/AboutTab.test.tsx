import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { AboutTab, getAppTitlesToDisplay } from './AboutTab';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { mockRepository1, mockRepository2 } from '../../../mocks/repositoryMock';
import { formatDateToDateAndTimeString } from 'app-development/utils/dateUtils';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { app, org } from '@studio/testing/testids';
import { renderWithProviders } from 'app-development/test/mocks';
import { APP_NAME, DEFAULT_LANGUAGE } from 'app-shared/constants';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { PreviewContextProps } from '../../../../../../../../contexts/PreviewContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { RecommendedLanguageFlags, ServiceNames } from './InputFields/InputFields';

const nb: string = 'nb';
const nn: string = 'nn';
const en: string = 'en';
const se: string = 'se';
const da: string = 'da';
const mockNewText: string = 'test';
const mockAppTitle = 'mockAppTitle';
const mockAppMetadata: ApplicationMetadata = {
  id: `${org}/${app}`,
  org,
  title: { [DEFAULT_LANGUAGE]: mockAppTitle },
  createdBy: 'Test Testesen',
};

describe('AboutTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderAboutTab();

    expect(screen.getByTitle(textMock('settings_modal.loading_content'))).toBeInTheDocument();
  });

  it('fetches languages on mount', () => {
    renderAboutTab();
    expect(queriesMock.getTextLanguages).toHaveBeenCalledTimes(1);
  });

  it('fetches repoMetadata on mount', () => {
    renderAboutTab();
    expect(queriesMock.getRepoMetadata).toHaveBeenCalledTimes(1);
  });

  it('fetches applicationMetadata on mount', () => {
    renderAboutTab();
    expect(queriesMock.getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it.each(['getTextLanguages', 'getRepoMetadata', 'getAppMetadata'])(
    'shows an error message if an error occured on the %s query',
    async (queryName: string) => {
      const errorMessage = 'error-message-test';
      renderAboutTab({
        [queryName]: jest.fn().mockImplementation(() => Promise.reject({ message: errorMessage })),
      });

      await waitForElementToBeRemoved(() =>
        screen.queryByTitle(textMock('settings_modal.loading_content')),
      );

      expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
      expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    },
  );

  it('displays the "repo" input as readonly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const repoNameInput = screen.getByLabelText(textMock('settings_modal.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockRepository1.name);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('displays correct value in "name" input field, and updates the value on change', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const appName = screen.getByLabelText(textMock('language.nb'));
    expect(appName).toHaveValue(mockAppMetadata.title.nb);
    await user.clear(appName);
    await user.type(appName, mockNewText);

    expect(appName).toHaveValue(mockNewText);
  });

  it('displays empty input fields for recommended app title languages even though titles are not set in appMetadata', async () => {
    const getAppMetadata = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...mockAppMetadata, title: {} }));
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata });

    [nb, nn, en].forEach((lang) => {
      const appName = screen.getByRole('textbox', { name: textMock(`language.${lang}`) });
      expect(appName).toBeInTheDocument();
      expect(appName).not.toHaveValue();
    });
  });

  it('displays input fields for recommended app title languages as readOnly if app does not have translation for them', async () => {
    const getTextLanguages = jest.fn().mockImplementation(() => Promise.resolve([]));
    const getAppMetadata = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...mockAppMetadata, title: {} }));
    await resolveAndWaitForSpinnerToDisappear({ getTextLanguages, getAppMetadata });

    [nb, nn, en].forEach((lang) => {
      const appName = screen.getByRole('textbox', { name: textMock(`language.${lang}`) });
      expect(appName).toBeDisabled();
    });
  });

  it('displays input fields for remaining app titles for languages available in app in addition to the recommended', async () => {
    const getTextLanguages = jest
      .fn()
      .mockImplementation(() => Promise.resolve([DEFAULT_LANGUAGE, da]));
    await resolveAndWaitForSpinnerToDisappear({ getTextLanguages });

    [nb, nb, en, da].forEach((lang) => {
      const appName = screen.getByRole('textbox', { name: textMock(`language.${lang}`) });
      expect(appName).toBeInTheDocument();
    });
  });

  it('should update appMetadata and text resource for given language when saving', async () => {
    const user = userEvent.setup();
    await resolveAndWaitForSpinnerToDisappear();

    const serviceNameNb = screen.getByLabelText(textMock('language.nb'));
    await user.clear(serviceNameNb);
    await user.type(serviceNameNb, mockNewText);
    await user.tab();

    expect(queriesMock.updateAppMetadata).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateAppMetadata).toHaveBeenCalledWith(
      org,
      app,
      expect.objectContaining({ title: { nb: mockNewText } }),
    );
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, DEFAULT_LANGUAGE, {
      [APP_NAME]: mockNewText,
    });
  });

  it('displays owners full name when it is set', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    expect(screen.getByText(mockRepository1.owner.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockRepository1.owner.login)).not.toBeInTheDocument();
  });

  it('displays owners login name when full name is not set', async () => {
    const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockRepository2));
    await resolveAndWaitForSpinnerToDisappear({ getRepoMetadata });

    expect(screen.queryByText(mockRepository1.owner.full_name)).not.toBeInTheDocument();
    expect(screen.getByText(mockRepository1.owner.login)).toBeInTheDocument();
  });

  it('displays the created date mapped correctly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const formatedDateString: string = formatDateToDateAndTimeString(mockRepository1.created_at);

    expect(
      screen.getByText(
        textMock('settings_modal.about_tab_created_date', { date: formatedDateString }),
      ),
    ).toBeInTheDocument();
  });

  it('displays the user that created the app correctly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    expect(screen.getByText(mockAppMetadata.createdBy)).toBeInTheDocument();
  });

  it('calls "doReloadPreview" when changing service name', async () => {
    const user = userEvent.setup();

    const doReloadPreview = jest.fn();
    await resolveAndWaitForSpinnerToDisappear({}, { doReloadPreview });

    const serviceNameNb = screen.getByLabelText(textMock('language.nb'));
    await user.type(serviceNameNb, mockNewText);
    await user.tab();

    expect(doReloadPreview).toHaveBeenCalledTimes(1);
  });
});

const resolveAndWaitForSpinnerToDisappear = async (
  queries: Partial<ServicesContextProps> = {},
  previewContextProps: Partial<PreviewContextProps> = {},
) => {
  const getTextLanguages = jest.fn().mockImplementation(() => Promise.resolve([DEFAULT_LANGUAGE]));
  const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockRepository1));
  const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockAppMetadata));

  renderAboutTab(
    { getTextLanguages, getRepoMetadata, getAppMetadata, ...queries },
    { ...previewContextProps },
  );
  await waitForElementToBeRemoved(() =>
    screen.queryByTitle(textMock('settings_modal.loading_content')),
  );
};

const renderAboutTab = (
  queries: Partial<ServicesContextProps> = {},
  previewContextProps: Partial<PreviewContextProps> = {},
) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders({ ...queries }, queryClient, { ...previewContextProps })(<AboutTab />);
};

describe('getAppTitlesToDisplay', () => {
  it('returns empty recommended app titles if appMetadataTitles and appLangCodes are empty', () => {
    const appMetadataTitles: KeyValuePairs<string> = {};
    const appLangCodesData: string[] = [];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({ nb: undefined, nn: undefined, en: undefined });
  });

  it('returns empty recommended app titles if appMetadataTitles is empty and appLangCodes contains them', () => {
    const appMetadataTitles: KeyValuePairs<string> = {};
    const appLangCodesData: string[] = [nb, nn, en];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({ nb: undefined, nn: undefined, en: undefined });
  });

  it('returns the recommended app titles with values if present in appMetadataTitles', () => {
    const appNameNb: string = 'appNameNb';
    const appMetadataTitles: KeyValuePairs<string> = { nb: appNameNb };
    const appLangCodesData: string[] = [];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({ nb: appNameNb, nn: undefined, en: undefined });
  });

  it('returns the recommended app titles with values if present in appMetadataTitles and if languages are present in appLangCodesData', () => {
    const appNameNb: string = 'appNameNb';
    const appMetadataTitles: KeyValuePairs<string> = { nb: appNameNb };
    const appLangCodesData: string[] = [nb, nn, en];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({ nb: appNameNb, nn: undefined, en: undefined });
  });

  it('returns additional empty app titles if languages are present in appLangCodesData', () => {
    const appMetadataTitles: KeyValuePairs<string> = {};
    const appLangCodesData: string[] = [se, da];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({
      nb: undefined,
      nn: undefined,
      en: undefined,
      se: undefined,
      da: undefined,
    });
  });

  it('returns additional app titles with values if languages are present in appLangCodesData and appMetadataTitles', () => {
    const appNameSe: string = 'appNameSe';
    const appMetadataTitles: KeyValuePairs<string> = { se: appNameSe };
    const appLangCodesData: string[] = [se, da];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({
      nb: undefined,
      nn: undefined,
      en: undefined,
      se: appNameSe,
      da: undefined,
    });
  });

  it('return additional app title for language if language is not recommended and not in appLangCodes, but in appMetadataTitles', () => {
    const appNameSe: string = 'appNameSe';
    const appMetadataTitles: KeyValuePairs<string> = { se: appNameSe };
    const appLangCodesData: string[] = [];
    const appTitles: ServiceNames<RecommendedLanguageFlags> = getAppTitlesToDisplay(
      appMetadataTitles,
      appLangCodesData,
    );
    expect(appTitles).toEqual({ nb: undefined, nn: undefined, en: undefined, se: appNameSe });
  });
});
