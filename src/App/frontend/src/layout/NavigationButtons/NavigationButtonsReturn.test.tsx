import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CompNavigationButtonsExternal } from '@app/layout-contract/generated/components/NavigationButtons/config.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId, getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { httpResponse, renderGenericComponentTest } from 'src/test/renderWithProviders';

const nav: CompNavigationButtonsExternal = {
  id: 'nav',
  type: 'NavigationButtons',
  textResourceBindings: { backToPage: 'Return' },
};

function EditName() {
  const setLeafValue = FormStore.data.useSetLeafValue();
  return (
    <button
      onClick={() => setLeafValue({ reference: { dataType: defaultDataTypeMock, field: 'name' }, newValue: 'Ada' })}
    >
      Edit name
    </button>
  );
}

function VisiblePages() {
  return <div data-testid='visible-pages'>{usePageOrder().join(',')}</div>;
}

async function returnAfterSave(savedReveal: 'yes' | 'no') {
  // Saving on page change makes the save response arrive after the user has clicked the return button.
  window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
    ui.folders.Task_1.pages = { order: ['edited', 'middle', 'summary'], autoSaveBehavior: 'onChangePage' };
  });
  const user = userEvent.setup();
  const { mutations, routerRef } = await renderGenericComponentTest({
    type: 'NavigationButtons',
    renderer: (props) => (
      <>
        <EditName />
        <VisiblePages />
        <NavigationButtonsComponent {...props} />
      </>
    ),
    component: nav,
    initialPage: 'edited',
    query: 'backToPage=summary',
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.dataModels[defaultDataTypeMock].initialData = { name: '', reveal: 'no' };
          obj.layouts = {
            edited: { data: { layout: [nav] } },
            middle: {
              data: {
                hidden: ['notEquals', ['dataModel', 'reveal'], 'yes'],
                layout: [{ id: 'middle-text', type: 'Paragraph', textResourceBindings: { title: 'Middle' } }],
              },
            },
            summary: {
              data: { layout: [{ id: 'summary-text', type: 'Paragraph', textResourceBindings: { title: 'Summary' } }] },
            },
          };
        }),
    },
  });

  expect(screen.getByTestId('visible-pages')).toHaveTextContent('edited,summary');
  await user.click(screen.getByRole('button', { name: 'Edit name' }));
  await user.click(screen.getByRole('button', { name: 'Return' }));
  await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(1));

  // A backend calculation sets the field that decides whether the middle page is shown.
  mutations.doPatchMultipleFormData.resolve(
    httpResponse({
      newDataModels: [{ dataElementId: defaultMockDataElementId, data: { name: 'Ada', reveal: savedReveal } }],
      validationIssues: [],
      instance: getInstanceDataMock(),
    }),
  );
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument());

  return () => routerRef.current?.state.location.pathname;
}

describe('NavigationButtons return', () => {
  it('returns to the linked page after saving', async () => {
    const path = await returnAfterSave('no');
    await waitFor(() => expect(path()).toMatch(/\/summary$/));
  });

  it('stays on the page when the save response reveals a page on the way back', async () => {
    const path = await returnAfterSave('yes');
    expect(screen.getByTestId('visible-pages')).toHaveTextContent('edited,middle,summary');
    expect(screen.getByRole('button', { name: 'Neste' })).toBeInTheDocument();
    expect(path()).toMatch(/\/edited$/);
  });
});
