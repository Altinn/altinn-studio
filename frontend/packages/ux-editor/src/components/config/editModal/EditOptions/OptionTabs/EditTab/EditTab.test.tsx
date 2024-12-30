import React from 'react';
import { EditTab } from './EditTab';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

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

  it('should render error message when query fails', async () => {
    renderEditTab({
      queries: { getOptionListIds: jest.fn().mockImplementation(() => Promise.reject()) },
    });

    await waitForSpinnerToBeRemoved();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_fetch_option_list_ids_error_message')),
    ).toBeInTheDocument();
  });

  it('should render OptionListEditor', async () => {
    renderEditTab();

    await waitForSpinnerToBeRemoved();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_custom_list')),
    ).toBeInTheDocument();
  });

  it('should render AddOptionList', async () => {
    renderEditTab({
      componentProps: {
        options: undefined,
        optionsId: undefined,
      },
    });

    await waitForSpinnerToBeRemoved();
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.options.upload_title') }),
    ).toBeInTheDocument();
  });

  it('should call handleInitialManualOptionsChange when clicking add options', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditTab({
      componentProps: {
        options: undefined,
        optionsId: undefined,
      },
      handleComponentChange,
    });
    const expectedArgs = mockComponent;
    expectedArgs.options = [];
    expectedArgs.optionsId = undefined;

    await waitForSpinnerToBeRemoved();
    const addManualOptionsButton = screen.getByRole('button', {
      name: textMock('general.create_new'),
    });
    await user.click(addManualOptionsButton);

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
  });
});

async function waitForSpinnerToBeRemoved() {
  await waitForElementToBeRemoved(() =>
    screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
  );
}

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
        getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve<string[]>(['id'])),
        ...queries,
      },
      queryClient: createQueryClientMock(),
    },
  );
}
