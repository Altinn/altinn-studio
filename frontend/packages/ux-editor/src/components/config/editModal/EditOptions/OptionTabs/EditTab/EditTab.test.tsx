import React from 'react';
import { EditTab } from './EditTab';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];

describe('EditTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render spinner', () => {
    renderEditTab();

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    ).toBeInTheDocument();
  });

  it('should render component when loading is done', () => {
    renderEditTab();

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_custom_list')),
    ).toBeInTheDocument();
  });

  it('should render AddOptionList', () => {
    renderEditTab({
      componentProps: {
        options: undefined,
        optionsId: undefined,
      },
    });

    expect(
      screen.getByRole('button', { name: textMock('ux_editor.options.upload_title') }),
    ).toBeInTheDocument();
  });

  it('should set optionsId to blank when removing chosen code list', async () => {
    const user = userEvent.setup();
    const handleOptionsIdChange = jest.fn();
    renderEditTab({ handleComponentChange: handleOptionsIdChange });
    const expectedArgs = mockComponent;
    expectedArgs.optionsId = undefined;
    delete expectedArgs.options;

    const button = await screen.findByText(textMock('general.delete'));
    await user.click(button);

    expect(handleOptionsIdChange).toHaveBeenCalledTimes(1);
    expect(handleOptionsIdChange).toHaveBeenCalledWith(expectedArgs);
  });

  it('should render error when query fails', () => {
    renderEditTab({
      queries: { getOptionListIds: jest.fn().mockRejectedValueOnce(new Error('Error')) },
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_fetch_option_list_ids_error_message')),
    ).toBeInTheDocument();
  });
});

function renderEditTab({
  componentProps = {},
  handleComponentChange = jest.fn(),
  queries = {},
} = {}) {
  return renderWithProviders(
    <EditTab
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      handleComponentChange={handleComponentChange}
    />,
    {
      queries: {
        getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>([])),
        ...queries,
      },
    },
  );
}
