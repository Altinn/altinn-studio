import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '../../../../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ObjectUtils } from '@studio/pure-functions';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import type { OptionList } from 'app-shared/types/OptionList';
import type { OptionListEditorProps } from './OptionListEditor';
import { OptionListEditor } from './OptionListEditor';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const optionListId = 'someId';
const componentWithOptionsId = { ...mockComponent, options: undefined, optionsId: optionListId };
const handleComponentChange = jest.fn();
const optionList: OptionList = [
  { value: 'value 1', label: 'label 1', description: 'description', helpText: 'help text' },
  { value: 'value 2', label: 'label 2', description: null, helpText: null },
  { value: 'value 3', label: 'label 3', description: null, helpText: null },
];

describe('OptionListEditor', () => {
  afterEach(jest.clearAllMocks);

  it('should render ManualOptionsEditor when component has options property', async () => {
    const user = userEvent.setup();
    renderOptionListEditor();

    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.options.modal_header_manual_code_list')),
    ).toBeInTheDocument();
  });

  it('should render LibraryOptionsEditor when component has optionId property', async () => {
    const user = userEvent.setup();
    renderOptionListEditorWithData();

    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.options.modal_header_library_code_list')),
    ).toBeInTheDocument();
  });

  it('should render a spinner when there is no data', () => {
    renderOptionListEditor({
      queries: {
        getOptionList: jest.fn().mockImplementation(() => Promise.resolve<OptionList>([])),
      },
      props: { component: componentWithOptionsId },
    });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    ).toBeInTheDocument();
  });

  it('should render an error message when getOptionList throws an error', async () => {
    renderOptionListEditorWithData({
      queries: {
        getOptionList: jest.fn().mockImplementation(() => Promise.reject()),
      },
      props: { component: componentWithOptionsId },
    });
    await waitForElementToBeRemoved(() =>
      screen.queryByText(textMock('ux_editor.modal_properties_code_list_spinner_title')),
    );

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_fetch_option_list_error_message')),
    ).toBeInTheDocument();
  });

  it('should be able to remove binding to optionList if getOptionList throws an error', async () => {
    const user = userEvent.setup();
    renderOptionListEditorWithData({
      queries: {
        getOptionList: jest.fn().mockImplementation(() => Promise.reject()),
      },
    });
    const expectedArgs = ObjectUtils.deepCopy(componentWithOptionsId);
    expectedArgs.optionsId = undefined;

    expect(getDeleteButton()).toBeInTheDocument();
    await user.click(getDeleteButton());
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith(expectedArgs);
  });
});

function getEditButton() {
  return screen.getByRole('button', {
    name: textMock('general.edit'),
  });
}

function getDeleteButton() {
  return screen.getByRole('button', {
    name: textMock('general.delete'),
  });
}

const defaultProps: OptionListEditorProps = {
  component: mockComponent,
  handleComponentChange,
};

function renderOptionListEditor({
  queries = {},
  props = {},
  queryClient = createQueryClientMock(),
} = {}) {
  renderWithProviders(<OptionListEditor {...defaultProps} {...props} />, {
    queries,
    queryClient,
  });
}

function renderOptionListEditorWithData({
  queries = {},
  props = { component: componentWithOptionsId },
} = {}) {
  const queryClient = createQueryClientWithData();
  renderOptionListEditor({ queries, props, queryClient });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], optionList);
  return queryClient;
}
