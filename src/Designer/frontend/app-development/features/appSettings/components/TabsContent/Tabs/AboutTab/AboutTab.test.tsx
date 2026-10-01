import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AboutTab } from './AboutTab';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { mockAppMetadata } from 'app-development/test/applicationMetadataMock';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { org, app } from '@studio/testing/testids';
import { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';

describe('AboutTab', () => {
  afterEach(jest.clearAllMocks);

  it('initially displays the spinner when loading data', () => {
    renderAboutTab();
    expect(screen.getByText(textMock('app_settings.loading_content'))).toBeInTheDocument();
  });

  it('fetches applicationMetadata on mount', () => {
    const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
    renderAboutTab({ getAppMetadata });
    expect(getAppMetadata).toHaveBeenCalledTimes(1);
  });

  it('shows an error message if an error occurred on the getAppMetadata query', async () => {
    const errorMessage = 'error-message-test';

    await resolveAndWaitForSpinnerToDisappear({
      getAppMetadata: () => Promise.reject({ message: errorMessage }),
    });

    expect(screen.getByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.error_message_with_colon'))).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('displays the "repo" input as readonly', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const repoNameInput = screen.getByLabelText(textMock('app_settings.about_tab_repo_label'));
    expect(repoNameInput).toHaveValue(mockAppMetadata.id);
    expect(repoNameInput).toHaveAttribute('readonly');
  });

  it('renders AppConfigForm when data is loaded', async () => {
    await resolveAndWaitForSpinnerToDisappear();

    const matches = screen.getAllByText(
      textMock('app_settings.about_tab_contact_point_dialog_add_title'),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('saves unversioned metadata without a revision', async () => {
    const user = userEvent.setup();
    const updateAppMetadata = jest.fn().mockResolvedValue(mockAppMetadata);
    await resolveAndWaitForSpinnerToDisappear({ updateAppMetadata });

    await user.type(getTitleInput(), ' edited');
    await user.click(
      screen.getByRole('button', { name: textMock('app_settings.about_tab_save_button') }),
    );

    await waitFor(() => expect(updateAppMetadata).toHaveBeenCalledTimes(1));
    expect(updateAppMetadata.mock.calls[0][2]).not.toHaveProperty('revision');
    expect(getTitleInput()).toBeEnabled();
  });

  it('initializes v9 metadata from the mount refetch', async () => {
    const user = userEvent.setup();
    const cachedMetadata: ApplicationMetadata = {
      ...mockAppMetadata,
      revision: '"cached-revision"',
      title: { nb: 'Cached title', nn: 'Cached Nynorsk title', en: 'Cached English title' },
    };
    const currentMetadata: ApplicationMetadata = {
      ...cachedMetadata,
      revision: '"current-revision"',
      title: { ...cachedMetadata.title, nb: 'Current title' },
    };
    // Production refetches stale data when the tab mounts.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    queryClient.setQueryData([QueryKey.AppMetadata, org, app], cachedMetadata);
    const updateAppMetadata = jest.fn().mockResolvedValue(currentMetadata);

    renderAboutTab(
      { getAppMetadata: jest.fn().mockResolvedValue(currentMetadata), updateAppMetadata },
      queryClient,
    );
    expect(queryPageSpinner()).toBeInTheDocument();
    await waitForElementToBeRemoved(queryPageSpinner);

    expect(getTitleInput()).toHaveValue('Current title');
    await user.type(getTitleInput(), ' edited');
    await user.click(
      screen.getByRole('button', { name: textMock('app_settings.about_tab_save_button') }),
    );
    await waitFor(() =>
      expect(updateAppMetadata).toHaveBeenCalledWith(org, app, {
        ...currentMetadata,
        title: { ...currentMetadata.title, nb: 'Current title edited' },
      }),
    );
  });

  it('preserves a v9 draft through reload failure and saves with the reloaded revision', async () => {
    const user = userEvent.setup();
    const initialMetadata: ApplicationMetadata = {
      ...mockAppMetadata,
      revision: '"initial-revision"',
      title: { nb: 'Original title', nn: 'Original Nynorsk title', en: 'Original English title' },
    };
    const latestMetadata: ApplicationMetadata = {
      ...initialMetadata,
      revision: '"latest-revision"',
      title: { ...initialMetadata.title, nb: 'Latest title' },
      homepage: 'https://example.com/latest',
    };
    const getAppMetadata = jest
      .fn()
      .mockResolvedValueOnce(initialMetadata)
      .mockResolvedValueOnce(latestMetadata)
      .mockRejectedValueOnce(new Error('Reload failed'))
      .mockResolvedValue(latestMetadata);
    const updateAppMetadata = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 412 } })
      .mockResolvedValue({ ...latestMetadata, revision: '"saved-revision"' });
    await resolveAndWaitForSpinnerToDisappear({ getAppMetadata, updateAppMetadata });

    await user.clear(getTitleInput());
    await user.type(getTitleInput(), 'Local draft');
    await user.click(
      screen.getByRole('button', { name: textMock('app_settings.about_tab_save_button') }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('app_settings.metadata_save_conflict'),
    );
    // The background refresh must preserve the draft.
    await waitFor(() => expect(getAppMetadata).toHaveBeenCalledTimes(2));
    expect(getTitleInput()).toHaveValue('Local draft');
    expect(getTitleInput()).toBeDisabled();
    expect(updateAppMetadata).toHaveBeenCalledWith(org, app, {
      ...initialMetadata,
      title: { ...initialMetadata.title, nb: 'Local draft' },
    });

    const reloadButton = screen.getByRole('button', {
      name: textMock('app_settings.metadata_reload'),
    });
    await user.click(reloadButton);
    await waitFor(() => expect(reloadButton).toBeEnabled());
    expect(getAppMetadata).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('alert')).toHaveTextContent(
      textMock('app_settings.metadata_save_conflict'),
    );
    expect(getTitleInput()).toHaveValue('Local draft');
    expect(getTitleInput()).toBeDisabled();

    await user.click(reloadButton);
    await waitFor(() => expect(getTitleInput()).toHaveValue('Latest title'));
    expect(getTitleInput()).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getAppMetadata).toHaveBeenCalledTimes(4);

    await user.type(getTitleInput(), ' edited');
    await user.click(
      screen.getByRole('button', { name: textMock('app_settings.about_tab_save_button') }),
    );
    await waitFor(() =>
      expect(updateAppMetadata).toHaveBeenLastCalledWith(org, app, {
        ...latestMetadata,
        title: { ...latestMetadata.title, nb: 'Latest title edited' },
      }),
    );
    expect(updateAppMetadata).toHaveBeenCalledTimes(2);
  });
});

const renderAboutTab = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries = {
    ...queriesMock,
    ...queries,
  };
  return renderWithProviders(allQueries, queryClient)(<AboutTab />);
};

const resolveAndWaitForSpinnerToDisappear = async (queries: Partial<ServicesContextProps> = {}) => {
  const getAppMetadata = jest.fn().mockImplementation(() => Promise.resolve(mockAppMetadata));

  renderAboutTab({
    getAppMetadata,
    ...queries,
  });
  await waitForElementToBeRemoved(queryPageSpinner);
};

const queryPageSpinner = () => screen.queryByText(textMock('app_settings.loading_content'));

const getTitleInput = () =>
  screen.getByRole('textbox', {
    name: `${textMock('app_settings.about_tab_name_label')} (${textMock('language.nb')})`,
  });
