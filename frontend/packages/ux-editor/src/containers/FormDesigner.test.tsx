import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderHookWithMockStore, renderWithMockStore } from '../testing/mocks';
import { FormDesigner } from './FormDesigner';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { useWidgetsQuery } from '../hooks/queries/useWidgetsQuery';

// Test data:
const org = 'org';
const app = 'app';

const render = () => {
  const queries = {
    getInstanceIdForPreview: jest.fn().mockImplementation(() => Promise.resolve('test'))
  };
  const props = {
    selectedLayout: 'test-layout',
    selectedLayoutSet: 'test-layout-set',
  };
  return renderWithMockStore({}, queries)(
    <FormDesigner {...props} />
  );
};

const waitForData = async () => {
  const widgetsResult = renderHookWithMockStore()(() => useWidgetsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(widgetsResult.current.isSuccess).toBe(true));
};

describe('FormDesigner', () => {
  it('should render the spinner', () => {
    render();
    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should render the component', async () => {
    await waitForData();
    render();
    await waitFor(() => expect(screen.queryByText(textMock('general.loading'))).not.toBeInTheDocument());
  });
});
