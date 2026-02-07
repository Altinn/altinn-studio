import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
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
import type { ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { textResourcesMock } from 'app-shared/mocks/textResourcesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';
import type { CodeListIdContextData } from '../../types/CodeListIdContextData';
import type { PublishedCodeListReferenceValues } from '../../types/PublishedCodeListReferenceValues';
import { createPublishedCodeListReferenceString } from '../../utils/published-code-list-reference-utils';

// Mocks:
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

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
const app = 'app';
const org = 'org';
const appRouteParams: AppRouteParams = { org, app };
const textResources: ITextResources = {
  [DEFAULT_LANGUAGE]: textResourcesMock.resources,
};
const onEditButtonClick = jest.fn();
const codeListIdContextData: CodeListIdContextData = {
  idsFromAppLibrary: [optionListId],
  orgName: org,
};

describe('OptionListEditor', () => {
  afterEach(jest.clearAllMocks);

  it('Calls onEditButtonClick when the options property is set and the user clicks the edit button', async () => {
    const user = userEvent.setup();
    renderOptionListEditor();

    await user.click(getEditButton());
    expect(onEditButtonClick).toHaveBeenCalledTimes(1);
  });

  it('should render library options editor when the given optionsId exists in the list of code list IDs from the app library', async () => {
    const user = userEvent.setup();
    renderOptionListEditorWithData();

    await user.click(getEditButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.options.modal_header_library_code_list')),
    ).toBeInTheDocument();
  });

  it('Displays the interface for published code lists when optionsId refers to a published code list', () => {
    const codeListName = 'some-published-code-list';
    const version = '12';
    const refValues: PublishedCodeListReferenceValues = { orgName: org, codeListName, version };
    const optionsId = createPublishedCodeListReferenceString(refValues);
    renderOptionListEditor({ props: { component: { ...componentWithOptionsId, optionsId } } });

    const expectedText = textMock('ux_editor.options.published_code_list_in_use');
    expect(screen.getByText(expectedText)).toBeInTheDocument();
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
    renderOptionListEditor({
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
  codeListIdContextData,
  component: mockComponent,
  onEditButtonClick,
  handleComponentChange,
  textResources,
};

function renderOptionListEditorWithData({
  props = { component: componentWithOptionsId },
  queryClient = createQueryClientWithData(),
  ...rest
}: RenderOptionListEditorArgs = {}): void {
  renderOptionListEditor({ props, queryClient, ...rest });
}

function createQueryClientWithData(): QueryClient {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.OptionList, org, app, optionListId], optionList);
  return queryClient;
}

type RenderOptionListEditorArgs = {
  queries?: Partial<ServicesContextProps>;
  props?: Partial<OptionListEditorProps>;
  queryClient?: QueryClient;
};

function renderOptionListEditor({
  queries = {},
  props = {},
  queryClient = createQueryClientMock(),
}: RenderOptionListEditorArgs = {}): void {
  renderWithProviders(<OptionListEditor {...defaultProps} {...props} />, {
    queries,
    queryClient,
    appRouteParams,
  });
}
