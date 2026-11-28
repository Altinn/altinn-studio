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

  it('reads the data again each time it opens, as the form in preview changes it', async () => {
    const readPreviewFormData = vi
      .fn()
      .mockResolvedValueOnce(formData)
      .mockResolvedValueOnce({
        dataElements: [{ id: 'element', dataType: 'model', data: { name: 'Ola' } }],
      });
    const { rerender } = renderDialog({ readPreviewFormData });
    await screen.findByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'model' }),
    });

    rerender(dialog({ readPreviewFormData, open: false }));
    rerender(dialog({ readPreviewFormData, open: true }));

    const data = await screen.findByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'model' }),
    });
    expect(JSON.parse((data as HTMLTextAreaElement).value)).toEqual({ name: 'Ola' });
    expect(readPreviewFormData).toHaveBeenCalledTimes(2);
  });

  it('forgets a failed save when the developer edits the data', async () => {
    const user = userEvent.setup();
    renderDialog({ updatePreviewFormData: vi.fn().mockRejectedValue(new Error('Failed')) });
    const data = await screen.findByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'model' }),
    });
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(
      await screen.findByText(textMock('ux_editor.preview.form_data.save_failed')),
    ).toBeInTheDocument();

    await user.type(data, ' ');

    expect(
      screen.queryByText(textMock('ux_editor.preview.form_data.save_failed')),
    ).not.toBeInTheDocument();
  });

  it('says so when it cannot read the data', async () => {
    renderDialog({ readPreviewFormData: vi.fn().mockRejectedValue(new Error('Failed')) });

    expect(await screen.findByText(textMock('general.fetch_error_message'))).toBeInTheDocument();
  });

  it('says so when the form has no data', async () => {
    renderDialog({ readPreviewFormData: vi.fn().mockResolvedValue({ dataElements: [] }) });

    expect(
      await screen.findByText(textMock('ux_editor.preview.form_data.none')),
    ).toBeInTheDocument();
  });

  it('shows the data of the data model the developer chooses', async () => {
    const user = userEvent.setup();
    renderDialog({
      readPreviewFormData: vi.fn().mockResolvedValue({
        dataElements: [
          { id: 'first', dataType: 'model', data: { name: 'Kari' } },
          { id: 'second', dataType: 'other', data: { name: 'Ola' } },
        ],
      }),
    });

    await user.selectOptions(
      await screen.findByRole('combobox', {
        name: textMock('ux_editor.preview.form_data.data_model'),
      }),
      'second',
    );

    const data = screen.getByRole('textbox', {
      name: textMock('ux_editor.preview.form_data.data', { dataType: 'other' }),
    });
    expect(JSON.parse((data as HTMLTextAreaElement).value)).toEqual({ name: 'Ola' });
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

const dialog = ({
  readPreviewFormData = vi.fn().mockResolvedValue(formData),
  updatePreviewFormData = vi.fn().mockResolvedValue(undefined),
  onSaved = vi.fn(),
  open = true,
}: RenderArgs = {}) => (
  <ServicesContextProvider
    {...queriesMock}
    readPreviewFormData={readPreviewFormData}
    updatePreviewFormData={updatePreviewFormData}
    client={queryClient}
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
  </ServicesContextProvider>
);

let queryClient = createQueryClientMock();

const renderDialog = (args: RenderArgs = {}) => {
  queryClient = createQueryClientMock();
  return render(dialog(args));
};
