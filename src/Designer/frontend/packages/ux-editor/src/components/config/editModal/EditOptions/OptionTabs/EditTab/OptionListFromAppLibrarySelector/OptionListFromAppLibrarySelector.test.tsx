import React from 'react';
import { OptionListFromAppLibrarySelector } from './OptionListFromAppLibrarySelector';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { renderWithProviders, optionListIdsMock } from '../../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { FormComponent } from '../../../../../../../types/FormComponent';

// Test data:
const mockComponent: FormComponent<ComponentType.Dropdown> = componentMocks[ComponentType.Dropdown];
const optionsIdMock = optionListIdsMock[0];
mockComponent.optionsId = optionsIdMock;

const handleComponentChangeMock = jest.fn();
const getOptionListIdsMock = jest
  .fn()
  .mockImplementation(() => Promise.resolve<string[]>(optionListIdsMock));

describe('OptionListFromAppLibrarySelector', () => {
  it('should render the component', async () => {
    renderOptionListSelector();
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );

    expect(screen.getByText(textMock('ux_editor.modal_properties_code_list'))).toBeInTheDocument();
  });

  it('should not render if the list is empty', async () => {
    renderOptionListSelector({
      getOptionListIds: jest.fn().mockImplementation(() => Promise.resolve([])),
    });
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );

    expect(
      screen.queryByText(textMock('ux_editor.modal_properties_code_list')),
    ).not.toBeInTheDocument();
  });

  it('should call onChange when option list changes', async () => {
    const user = userEvent.setup();
    renderOptionListSelector();
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );

    await user.click(getDropdownButton());
    await user.click(getDropdownOption());

    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
  });

  it('should remove options property (if it exists) when optionsId property changes', async () => {
    const user = userEvent.setup();
    renderOptionListSelector({
      componentProps: {
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    await waitForElementToBeRemoved(
      screen.queryByText(textMock('ux_editor.modal_properties_loading')),
    );

    await user.click(getDropdownButton());
    await user.click(getDropdownOption());

    expect(handleComponentChangeMock).toHaveBeenCalledWith({
      ...mockComponent,
      options: undefined,
      optionsId: 'test-1',
    });
  });

  it('should render returned error message if option list endpoint returns an error', async () => {
    renderOptionListSelector({
      getOptionListIds: jest.fn().mockImplementation(() => Promise.reject(new Error('Error'))),
    });

    expect(await screen.findByText('Error')).toBeInTheDocument();
  });

  it('should render standard error message if option list endpoint throws an error without specified error message', async () => {
    renderOptionListSelector({
      getOptionListIds: jest.fn().mockImplementation(() => Promise.reject()),
    });

    expect(
      await screen.findByText(
        textMock('ux_editor.modal_properties_fetch_option_list_ids_error_message'),
      ),
    ).toBeInTheDocument();
  });
});

function getDropdownButton(): HTMLElement {
  return screen.getByRole('button', { name: textMock('ux_editor.modal_properties_code_list') });
}

function getDropdownOption(): HTMLElement {
  return screen.getByText(optionListIdsMock[0]);
}

function renderOptionListSelector({
  getOptionListIds = getOptionListIdsMock,
  componentProps = {},
} = {}) {
  return renderWithProviders(
    <OptionListFromAppLibrarySelector
      component={{
        ...mockComponent,
        ...componentProps,
      }}
      handleComponentChange={handleComponentChangeMock}
    />,
    {
      queries: { getOptionListIds },
      queryClient: createQueryClientMock(),
    },
  );
}
