import React from 'react';

import { waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

describe('FormProvider', () => {
  it('loads the UI folder of a subform PDF service task with the subform being rendered', async () => {
    const subformIds = ['aaaaaaaa-1111-2222-3333-444444444444', 'bbbbbbbb-1111-2222-3333-444444444444'];
    const instance = getInstanceWithProcessMock();
    instance.data.push(...subformIds.map((id) => ({ ...instance.data[0], id, dataType: 'subform' }) as IData));
    window.altinnAppGlobalData.ui.folders.Task_SubformPdf = { defaultDataType: 'subform', pages: { order: ['Pdf'] } };
    const fetchFormBootstrapForInstance = vi.fn(async () => getFormBootstrapMock());

    await renderWithoutInstanceAndLayout({
      renderer: () => <div />,
      withFormProvider: true,
      waitUntilLoaded: false,
      router: ({ children }) => (
        <InstanceRouter
          initialPath={`/ttd/test/instance/${instance.id}/Task_SubformPdf/subform/subform-component/${subformIds[1]}`}
          query='pdf=1'
          alwaysRouteToChildren={true}
        >
          {children}
        </InstanceRouter>
      ),
      queries: { fetchFormBootstrapForInstance },
      apis: { instanceApi: { getInstance: async () => instance } },
    });

    await waitFor(() =>
      expect(fetchFormBootstrapForInstance).toHaveBeenCalledWith(
        expect.objectContaining({ uiFolder: 'Task_SubformPdf', dataElementId: subformIds[1], pdf: true }),
      ),
    );
  });
});
