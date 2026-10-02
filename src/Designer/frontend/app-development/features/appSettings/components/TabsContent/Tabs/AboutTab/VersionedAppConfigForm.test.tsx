import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'app-development/test/mocks';
import { mockAppMetadata } from 'app-development/test/applicationMetadataMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { VersionedAppConfigForm } from './VersionedAppConfigForm';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { org, app } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ComponentProps } from 'react';
import type { AppConfigForm } from './AppConfigForm';

jest.mock('./AppConfigForm', () => ({
  AppConfigForm: ({ appConfig, saveAppConfig }: ComponentProps<typeof AppConfigForm>) => (
    <button onClick={() => saveAppConfig({ ...appConfig, homepage: 'https://example.com' })}>
      Save {appConfig.revision}
    </button>
  ),
}));

const initialMetadata: ApplicationMetadata = { ...mockAppMetadata, revision: 'initial' };
const savedMetadata: ApplicationMetadata = { ...initialMetadata, revision: 'saved' };

describe('VersionedAppConfigForm', () => {
  afterEach(jest.clearAllMocks);

  it('uses the saved revision for the next metadata edit', async () => {
    const user = userEvent.setup();
    const updateAppMetadata = jest.fn().mockResolvedValue(savedMetadata);
    renderForm({ updateAppMetadata });
    await user.click(screen.getByRole('button', { name: 'Save initial' }));
    await user.click(await screen.findByRole('button', { name: 'Save saved' }));
    expect(updateAppMetadata).toHaveBeenLastCalledWith(org, app, {
      ...savedMetadata,
      homepage: 'https://example.com',
    });
  });

  it('shows a generic save error for server failures', async () => {
    const user = userEvent.setup();
    const updateAppMetadata = jest.fn().mockRejectedValue({ response: { status: 500 } });
    renderForm({ updateAppMetadata });
    await user.click(screen.getByRole('button', { name: 'Save initial' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('app_settings.metadata_save_failed'),
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      textMock('app_settings.metadata_save_conflict'),
    );
    expect(screen.getByRole('button', { name: 'Save initial' })).toBeDisabled();
  });
});

function renderForm({ updateAppMetadata }: { updateAppMetadata: jest.Mock }) {
  return renderWithProviders(
    { updateAppMetadata },
    createQueryClientMock(),
  )(
    <VersionedAppConfigForm
      initialMetadata={initialMetadata}
      reload={jest.fn().mockResolvedValue(savedMetadata)}
    />,
  );
}
