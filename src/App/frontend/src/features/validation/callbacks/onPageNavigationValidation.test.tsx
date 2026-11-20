import React, { useState } from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { ValidationMask } from 'src/features/validation';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('page navigation validation cancellation', () => {
  it.each([false, true])(
    'updates error visibility after subform validation only if not cancelled (%s)',
    async (cancelled) => {
      let isCancelled = false;
      let releaseValidation = () => {};
      const validationReleased = new Promise<void>((resolve) => (releaseValidation = resolve));

      function ValidationProbe() {
        const validate = useOnPageNavigationValidation();
        const pageMask = FormStore.raw.useSelector((state) => state.validation.pageMasks.Form);
        const [result, setResult] = useState('idle');
        return (
          <>
            <button
              onClick={() => {
                setResult('pending');
                void validate('Form', { page: 'current', show: ['Required'] }, () => isCancelled).then((blocked) =>
                  setResult(blocked ? 'blocked' : 'allowed'),
                );
              }}
            >
              Validate
            </button>
            <div data-testid='result'>{result}</div>
            <div data-testid='page-mask'>{pageMask ?? 'hidden'}</div>
          </>
        );
      }

      window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
        ui.folders.Task_1.pages = { order: ['Form'], autoSaveBehavior: 'onChangePage' };
      });
      const { queries } = await renderWithInstanceAndLayout({
        renderer: () => <ValidationProbe />,
        initialPage: 'Form',
        queries: {
          fetchBackendValidations: async () => {
            await validationReleased;
            return [];
          },
          fetchFormBootstrapForInstance: async () =>
            getFormBootstrapMock((obj) => {
              obj.dataModels[defaultDataTypeMock].initialData = { name: '' };
              obj.layouts = {
                Form: {
                  data: {
                    layout: [
                      { id: 'subform', type: 'Subform', layoutSet: 'subform-layout', tableColumns: [] },
                      {
                        id: 'name',
                        type: 'Input',
                        required: true,
                        dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'name' } },
                      },
                    ],
                  },
                },
              };
            }),
        },
      });

      await userEvent.click(screen.getByRole('button', { name: 'Validate' }));
      await waitFor(() => expect(queries.fetchBackendValidations).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('result')).toHaveTextContent('pending');
      expect(screen.getByTestId('page-mask')).toHaveTextContent('hidden');

      isCancelled = cancelled;
      releaseValidation();

      await waitFor(() => expect(screen.getByTestId('result')).not.toHaveTextContent('pending'));
      expect(screen.getByTestId('page-mask')).toHaveTextContent(cancelled ? 'hidden' : String(ValidationMask.Required));
      expect(screen.getByTestId('result')).toHaveTextContent(cancelled ? 'allowed' : 'blocked');
    },
  );
});
