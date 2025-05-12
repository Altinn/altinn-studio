import React from 'react';
import { OptionListUploader } from './OptionListUploader';
import { screen } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { renderWithProviders, optionListIdsMock } from '../../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const optionsIdMock = optionListIdsMock[0];
mockComponent.optionsId = optionsIdMock;

const handleComponentChangeMock = jest.fn();
const getOptionListIds = jest
  .fn()
  .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock));

describe('OptionListUploader', () => {
  it('should render the component', () => {
    renderEditOptionList();
    expect(screen.getByText(textMock('ux_editor.options.upload_title'))).toBeInTheDocument();
  });

  it('should render success toast if file upload is successful', async () => {
    const user = userEvent.setup();
    const file = new File(['hello'], 'hello.json', { type: 'text/json' });
    renderEditOptionList();

    await user.click(getUploadButton());
    await user.upload(getFileInput(), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('ux_editor.modal_properties_code_list_upload_success'),
    );
  });

  it('should render error toast if file already exists', async () => {
    const user = userEvent.setup();
    const file = new File([optionListIdsMock[0]], optionListIdsMock[0] + '.json', {
      type: 'text/json',
    });
    renderEditOptionList();

    await user.click(getUploadButton());
    await user.upload(getFileInput(), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('validation_errors.upload_file_name_occupied'),
    );
  });

  it('should render alert on invalid file name', async () => {
    const user = userEvent.setup();
    const invalidFileName = 'æ.json';
    const file = new File([optionListIdsMock[0]], invalidFileName, {
      type: 'text/json',
    });
    renderEditOptionList();

    await user.click(getUploadButton());
    await user.upload(getFileInput(), file);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      textMock('validation_errors.file_name_invalid'),
    );
  });
});

function getUploadButton() {
  return screen.getByRole('button', { name: textMock('ux_editor.options.upload_title') });
}

function getFileInput() {
  return screen.getByLabelText(textMock('ux_editor.options.upload_title'));
}

function renderEditOptionList({ queries = {}, componentProps = {} } = {}) {
  return renderWithProviders(
    <OptionListUploader
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      handleComponentChange={handleComponentChangeMock}
    />,
    {
      queries: { getOptionListIds, ...queries },
      queryClient: createQueryClientMock(),
    },
  );
}
