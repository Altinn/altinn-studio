import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { app, org } from '@designer/testing/testids';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { PreviewFormDataDialog } from './PreviewFormDataDialog';
import type { PreviewFormData } from 'app-shared/types/api/PreviewSession';

const sessionUrl = 'https://preview.test/0123456789abcdef0123456789abcdef/ttd/app/';
const instanceId = '51001/7b1b0d6c-1d4e-4c1f-9d0a-2b9b8e1f2a3c';
const formData: PreviewFormData = {
  dataElements: [{ id: 'element', dataType: 'model', data: { name: 'Kari' } }],
};

describe('PreviewFormDataDialog', () => {
  it('shows the form data of the instance as JSON', async () => {
    renderDialog();

    const data = await screen.findByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'model' }),
    });
    expect(JSON.parse((data as HTMLTextAreaElement).value)).toEqual({ name: 'Kari' });
  });

  it('saves the changed data, and lets the preview show it', async () => {
    const user = userEvent.setup();
    const updatePreviewFormData = vi.fn().mockResolvedValue(undefined);
    const onSaved = vi.fn();
    renderDialog({ updatePreviewFormData, onSaved });
    const data = await screen.findByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'model' }),
    });

    await user.clear(data);
    await user.type(data, '{{"name": "Ola"}');
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));

    expect(updatePreviewFormData).toHaveBeenCalledWith(
      org,
      app,
      sessionUrl,
      instanceId,
      'element',
      {
        name: 'Ola',
      },
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('saves only a JSON object', async () => {
    const user = userEvent.setup();
    renderDialog();
    const data = await screen.findByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'model' }),
    });

    await user.clear(data);
    await user.type(data, '[[]');

    expect(
      screen.getByText(textMock('ux_editor.preview.form_data.not_an_object')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.save') })).toBeDisabled();
  });

  it('reads nothing while it is closed', () => {
    const readPreviewFormData = vi.fn().mockResolvedValue(formData);
    renderDialog({ readPreviewFormData, open: false });

    expect(readPreviewFormData).not.toHaveBeenCalled();
  });
});

type RenderArgs = {
  readPreviewFormData?: () => Promise<PreviewFormData>;
  updatePreviewFormData?: () => Promise<void>;
  onSaved?: () => void;
  open?: boolean;
};

const renderDialog = ({
  readPreviewFormData = vi.fn().mockResolvedValue(formData),
  updatePreviewFormData = vi.fn().mockResolvedValue(undefined),
  onSaved = vi.fn(),
  open = true,
}: RenderArgs = {}) =>
  render(
    <ServicesContextProvider
      {...queriesMock}
      readPreviewFormData={readPreviewFormData}
      updatePreviewFormData={updatePreviewFormData}
      client={createQueryClientMock()}
    >
      <PreviewFormDataDialog
        org={org}
        app={app}
        sessionUrl={sessionUrl}
        instanceId={instanceId}
        open={open}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    </ServicesContextProvider>,
  );
