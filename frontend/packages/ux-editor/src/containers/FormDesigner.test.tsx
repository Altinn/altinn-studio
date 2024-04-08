import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import {
  formLayoutSettingsMock,
  renderHookWithProviders,
  renderWithProviders,
} from '../testing/mocks';
import { FormDesigner } from './FormDesigner';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { useWidgetsQuery } from '../hooks/queries/useWidgetsQuery';
import ruleHandlerMock from '../testing/ruleHandlerMock';
import type { ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { QueryKey } from 'app-shared/types/QueryKey';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

// Test data:
const org = 'org';
const app = 'app';

const defaultTexts: ITextResources = {
  [DEFAULT_LANGUAGE]: [],
};

const render = () => {
  const queryClient = createQueryClientMock();
  const queries = {
    getFormLayoutSettings: jest
      .fn()
      .mockImplementation(() => Promise.resolve(formLayoutSettingsMock)),
    getRuleModel: jest.fn().mockImplementation(() => Promise.resolve<string>(ruleHandlerMock)),
    getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve<string>('test')),
  };
  queryClient.setQueryData([QueryKey.TextResources, org, app], defaultTexts);
  return renderWithProviders(<FormDesigner />, {
    queries,
    queryClient,
    appContextProps: {
      selectedFormLayoutName: undefined,
    },
  });
};

const waitForData = async () => {
  const widgetsResult = renderHookWithProviders(() => useWidgetsQuery(org, app)).result;
  await waitFor(() => expect(widgetsResult.current.isSuccess).toBe(true));
};

describe('FormDesigner', () => {
  it('should render the spinner', () => {
    render();
    expect(screen.getByText(textMock('ux_editor.loading_form_layout'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    await waitForData();
    render();
    await waitFor(() =>
      expect(screen.queryByText(textMock('ux_editor.loading_form_layout'))).not.toBeInTheDocument(),
    );
  });
});
