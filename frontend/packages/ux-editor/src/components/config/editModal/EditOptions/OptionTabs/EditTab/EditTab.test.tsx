import React from 'react';
import type { EditTabProps } from './EditTab';
import { EditTab } from './EditTab';
import type { ExtendedRenderOptions } from '../../../../../../testing/mocks';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';
import type { ITextResources } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

// Test data:
const mockComponent = componentMocks[ComponentType.RadioButtons];
const defaultProps: EditTabProps = {
  component: mockComponent,
  handleComponentChange: jest.fn(),
};
const defaultOrg = 'org';
const defaultApp = 'app';
const defaultAppRouteParams: AppRouteParams = { org: defaultOrg, app: defaultApp };

// Mocks:
jest.mock('react-router-dom', () => jest.requireActual('react-router-dom')); // Todo: Remove this when we have removed the global mock: https://github.com/Altinn/altinn-studio/issues/14597

describe('EditTab', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render spinner', () => {
    renderEditTab();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('Makes the spinner disappear when the data is loaded', async () => {
    renderEditTab();
    await waitForSpinnerToBeRemoved();
  });

  it('should render error message when a query fails', async () => {
    renderEditTab({
      queries: { getOptionListIds: jest.fn().mockImplementation(() => Promise.reject()) },
    });

    await waitForSpinnerToBeRemoved();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_fetch_option_list_ids_error_message')),
    ).toBeInTheDocument();
  });

  it('should render preview of a custom code list when component has manual options set', () => {
    renderEditTabWithData({ props: { component: { ...mockComponent, optionsId: undefined } } });

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_code_list_custom_list')),
    ).toBeInTheDocument();
  });

  it('should render upload option list button when option list is not defined on component', () => {
    renderEditTabWithData({
      props: {
        component: {
          ...mockComponent,
          options: undefined,
          optionsId: undefined,
        },
      },
    });

    expect(
      screen.getByRole('button', { name: textMock('ux_editor.options.upload_title') }),
    ).toBeInTheDocument();
  });

  it('should call handleComponentChange with empty options array when clicking create new options', async () => {
    const user = userEvent.setup();
    const handleComponentChange = jest.fn();
    renderEditTabWithData({
      props: {
        component: {
          ...mockComponent,
          options: undefined,
          optionsId: undefined,
        },
        handleComponentChange,
      },
    });

    const addManualOptionsButton = screen.getByRole('button', {
      name: textMock('general.create_new'),
    });
    await user.click(addManualOptionsButton);

    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...mockComponent,
      options: [],
      optionsId: undefined,
    });
  });

  it('should render alert when options ID is a reference ID', () => {
    renderEditTabWithData({
      props: {
        component: {
          ...mockComponent,
          options: undefined,
          optionsId: 'option-id-that-does-not-exist-in-app',
        },
      },
    });

    expect(
      screen.getByText(textMock('ux_editor.options.tab_option_list_alert_title')),
    ).toBeInTheDocument();
  });

  it('Displays the dialog when the user clicks the edit button', async () => {
    const user = userEvent.setup();

    renderEditTabWithData();
    const editButton = screen.getByRole('button', { name: textMock('general.edit') });
    await user.click(editButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

async function waitForSpinnerToBeRemoved() {
  await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
}

type RenderEditTabArgs = {
  props?: Partial<EditTabProps>;
} & Partial<ExtendedRenderOptions>;

function renderEditTab({
  props,
  queryClient = createQueryClientMock(),
  ...rest
}: RenderEditTabArgs = {}) {
  return renderWithProviders(<EditTab {...defaultProps} {...props} />, {
    queryClient,
    ...rest,
  });
}

function renderEditTabWithData({
  appRouteParams = defaultAppRouteParams,
  queryClient = createQueryClientMock(),
  ...rest
}: RenderEditTabArgs = {}): void {
  const { org, app } = appRouteParams;
  const optionListIds: string[] = [];
  const textResources: ITextResources = { [DEFAULT_LANGUAGE]: [] };
  queryClient.setQueryData([QueryKey.OptionListIds, org, app], optionListIds);
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);
  renderEditTab({ appRouteParams, queryClient, ...rest });
}
