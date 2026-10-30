import React, { useEffect, useState } from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AllowedValidationMasks } from '@app/layout-contract/generated/common.generated';

import { type BackendValidationIssue, BackendValidationSeverity, type FieldValidation, ValidationMask } from '.';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { Form } from 'src/components/form/Form';
import { FormStore } from 'src/features/form/FormContext';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useAllValidations, useGetNodesWithErrors } from 'src/features/validation/validationHooks';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

function FormDataValue() {
  const formDataValue = FormStore.data.useDebouncedPick({ dataType: defaultDataTypeMock, field: 'TextField' });
  const [delayedValue, setDelayedValue] = useState(formDataValue);

  // This will ensure that the validation state gets updated in the error report by the time this value gets written to the DOM
  useEffect(() => {
    setDelayedValue(formDataValue);
  }, [formDataValue]);

  return <div data-testid='formDataValue'>{delayedValue ? delayedValue.toString() : '<empty>'}</div>;
}

describe('derived validation state', () => {
  beforeEach(() => {
    window.altinnAppGlobalData.textResources!.resources.push({ id: 'Form', value: 'This is a page title' });
    window.altinnAppGlobalData.textResources!.resources.push({ id: 'NextPage', value: 'This is the next page title' });
  });

  describe('validation visibility', () => {
    function render({
      text,
      showValidations,
      validateOnNext,
      backendValidations = [],
    }: {
      text: string;
      showValidations: AllowedValidationMasks;
      validateOnNext: AllowedValidationMasks;
      backendValidations?: string[];
    }) {
      window.altinnAppGlobalData.textResources = {
        language: 'nb',
        resources: [
          { id: 'Form', value: 'This is a page title' },
          { id: 'NextPage', value: 'This is the next page title' },
        ],
      };

      window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
        ui.folders.Task_1 = {
          defaultDataType: defaultDataTypeMock,
          pages: { order: ['Form', 'NextPage'] },
        };
      });

      return renderWithInstanceAndLayout({
        renderer: () => (
          <>
            <Form />
            <FormDataValue />
          </>
        ),
        initialPage: 'Form',
        queries: {
          fetchFormBootstrapForInstance: async () =>
            getFormBootstrapMock((obj) => {
              obj.dataModels[defaultDataTypeMock].initialData = {
                TextField: text,
              };
              obj.dataModels[defaultDataTypeMock].initialValidationIssues = backendValidations.map(
                (text) =>
                  ({
                    customTextKey: text,
                    field: 'TextField',
                    dataElementId: defaultMockDataElementId,
                    severity: BackendValidationSeverity.Error,
                    source: 'Custom',
                  }) as BackendValidationIssue,
              );
              obj.dataModels[defaultDataTypeMock].schema = {
                $id: 'test-schema',
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                type: 'object',
                properties: {
                  TextField: {
                    type: 'string',
                    maxLength: 10,
                  },
                },
                required: ['TextField'],
              };
              obj.layouts = {
                Form: {
                  data: {
                    layout: [
                      {
                        id: 'text-field',
                        type: 'Input',
                        textResourceBindings: {
                          title: 'Text',
                        },
                        dataModelBindings: {
                          simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' },
                        },
                        showValidations,
                        required: true,
                      },
                      {
                        id: 'navbuttons1',
                        type: 'NavigationButtons',
                        textResourceBindings: {
                          next: 'Next',
                          back: 'Back',
                        },
                        validateOnNext: {
                          page: 'current',
                          show: validateOnNext,
                        },
                      },
                    ],
                  },
                },
                NextPage: {
                  data: {
                    layout: [
                      {
                        id: 'message',
                        type: 'Paragraph',
                        textResourceBindings: {
                          title: 'This is the second page!',
                        },
                      },
                      {
                        id: 'navbuttons2',
                        type: 'NavigationButtons',
                        textResourceBindings: {
                          next: 'Next',
                          back: 'Back',
                        },
                        showBackButton: true,
                      },
                    ],
                  },
                },
              };
            }),
        },
      });
    }

    it('validation on navigating to next page should show up and block navigation', async () => {
      await render({ text: '', showValidations: [], validateOnNext: ['Required'] });

      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      const ErrorReport = await screen.findByTestId('ErrorReport');
      expect(screen.queryByText(/this is the second page!/i)).not.toBeInTheDocument();

      expect(within(ErrorReport).getByText(/du må fylle ut text/i)).toBeInTheDocument();
    });

    it('validation on navigating to next page should not be blocked by unrelated validations', async () => {
      await render({ text: 'this is too long', showValidations: ['Schema'], validateOnNext: ['Required'] });

      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      await screen.findByText(/this is the second page!/i);

      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
    });

    it('validation on navigating to next page should not remove visibility existing in showValidations, but add to them', async () => {
      await render({
        text: 'this is too long',
        showValidations: ['CustomBackend'],
        validateOnNext: ['Schema'],
        backendValidations: ['Backend says this is wrong'],
      });

      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      const ErrorReport = await screen.findByTestId('ErrorReport');
      expect(within(ErrorReport).getByText(/bruk 10 eller færre tegn/i)).toBeInTheDocument();
      expect(within(ErrorReport).getByText(/Backend says this is wrong/i)).toBeInTheDocument();
    });

    it('validation visibility is reduced as they are fixed', async () => {
      await render({ text: '', showValidations: [], validateOnNext: ['Required'] });

      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      const ErrorReport = await screen.findByTestId('ErrorReport');
      expect(screen.queryByText(/this is the second page!/i)).not.toBeInTheDocument();
      expect(within(ErrorReport).getByText(/du må fylle ut text/i)).toBeInTheDocument();

      const TextBox = screen.getByRole('textbox', { name: /text/i });

      await userEvent.type(TextBox, 'something');
      await userEvent.tab();

      await waitFor(() => expect(screen.getByTestId('formDataValue')).toHaveTextContent('something'));

      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();

      await userEvent.clear(TextBox);
      await userEvent.tab();

      await waitFor(() => expect(screen.getByTestId('formDataValue')).toHaveTextContent('<empty>'));

      // Even though we removed the value, the required validation should not be visible since it was previously fixed
      // and 'Required' is not present in its 'showValidations'.
      expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
    });

    it('selects fresh backend validations immediately after validation state is updated', async () => {
      function FreshBackendValidationProbe() {
        const store = FormStore.raw.useStore();
        const getNodesWithErrors = useGetNodesWithErrors();
        const [errorCount, setErrorCount] = useState(0);

        return (
          <button
            type='button'
            onClick={() => {
              const validation: FieldValidation = {
                field: 'TextField',
                dataElementId: defaultMockDataElementId,
                source: 'Custom',
                severity: 'error',
                category: ValidationMask.CustomBackend,
                message: { key: 'Backend says this is wrong' },
                backendValidationId: 'fresh-backend-validation',
              };

              store.getState().validation.updateBackendValidations({
                [defaultMockDataElementId]: { TextField: [validation] },
              });

              setErrorCount(getNodesWithErrors(ValidationMask.All, 'error', false).length);
            }}
          >
            {errorCount}
          </button>
        );
      }

      window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
        ui.folders.Task_1 = {
          defaultDataType: defaultDataTypeMock,
          pages: { order: ['Form'] },
        };
      });

      await renderWithInstanceAndLayout({
        renderer: () => <FreshBackendValidationProbe />,
        initialPage: 'Form',
        queries: {
          fetchFormBootstrapForInstance: async () =>
            getFormBootstrapMock((obj) => {
              obj.dataModels[defaultDataTypeMock].initialData = {
                TextField: 'valid value',
              };
              obj.layouts = {
                Form: {
                  data: {
                    layout: [
                      {
                        id: 'text-field',
                        type: 'Input',
                        textResourceBindings: {
                          title: 'Text',
                        },
                        dataModelBindings: {
                          simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' },
                        },
                        showValidations: ['CustomBackend'],
                      },
                    ],
                  },
                },
              };
            }),
        },
      });

      await userEvent.click(screen.getByRole('button', { name: '0' }));

      expect(screen.getByRole('button')).toHaveTextContent('1');
    });
  });
});

describe('backend validations linked to components', () => {
  function ValidationsProbe() {
    const validations = useAllValidations('showAll', 'error');
    const summary = validations
      .map((validation) => {
        const bindingKey = 'bindingKey' in validation ? validation.bindingKey : undefined;
        return `${validation.nodeId}:${validation.message.key}:${bindingKey ?? '-'}`;
      })
      .sort();
    return <div data-testid='validations'>{JSON.stringify(summary)}</div>;
  }

  async function render(issues: Omit<BackendValidationIssue, 'dataElementId' | 'severity' | 'source'>[]) {
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_1 = {
        defaultDataType: defaultDataTypeMock,
        pages: { order: ['Form'] },
      };
    });

    await renderWithInstanceAndLayout({
      renderer: () => <ValidationsProbe />,
      initialPage: 'Form',
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = {
              TextField: 'value',
              MyGroup: [
                { [ALTINN_ROW_ID]: 'row-0', Name: 'first', Inner: [{ [ALTINN_ROW_ID]: 'row-0-0', Value: 'a' }] },
                {
                  [ALTINN_ROW_ID]: 'row-1',
                  Name: 'second',
                  Inner: [
                    { [ALTINN_ROW_ID]: 'row-1-0', Value: 'b' },
                    { [ALTINN_ROW_ID]: 'row-1-1', Value: 'c' },
                  ],
                },
              ],
            };
            obj.dataModels[defaultDataTypeMock].initialValidationIssues = issues.map((issue) => ({
              dataElementId: defaultMockDataElementId,
              severity: BackendValidationSeverity.Error,
              source: 'Custom',
              ...issue,
            }));
            obj.layouts = {
              Form: {
                data: {
                  layout: [
                    {
                      id: 'first',
                      type: 'Input',
                      dataModelBindings: {
                        simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' },
                      },
                    },
                    {
                      id: 'second',
                      type: 'Input',
                      dataModelBindings: {
                        simpleBinding: { dataType: defaultDataTypeMock, field: 'TextField' },
                      },
                    },
                    {
                      id: 'myGroup',
                      type: 'RepeatingGroup',
                      dataModelBindings: {
                        group: { dataType: defaultDataTypeMock, field: 'MyGroup' },
                      },
                      children: ['name', 'innerGroup'],
                    },
                    {
                      id: 'name',
                      type: 'Input',
                      dataModelBindings: {
                        simpleBinding: { dataType: defaultDataTypeMock, field: 'MyGroup.Name' },
                      },
                    },
                    {
                      id: 'innerGroup',
                      type: 'RepeatingGroup',
                      dataModelBindings: {
                        group: { dataType: defaultDataTypeMock, field: 'MyGroup.Inner' },
                      },
                      children: ['value'],
                    },
                    {
                      id: 'value',
                      type: 'Input',
                      dataModelBindings: {
                        simpleBinding: { dataType: defaultDataTypeMock, field: 'MyGroup.Inner.Value' },
                      },
                    },
                  ],
                },
              },
            };
          }),
      },
    });

    return JSON.parse(screen.getByTestId('validations').textContent!) as string[];
  }

  it('shows a field validation on every component bound to the field when no component is given', async () => {
    const validations = await render([{ field: 'TextField', customTextKey: 'unlinked' }]);
    expect(validations).toEqual(['first:unlinked:simpleBinding', 'second:unlinked:simpleBinding']);
  });

  it('shows a field validation only on the component it is linked to', async () => {
    const validations = await render([{ field: 'TextField', componentId: 'second', customTextKey: 'linked' }]);
    expect(validations).toEqual(['second:linked:simpleBinding']);
  });

  it('shows validations on the linked row of a component in a repeating group', async () => {
    const validations = await render([
      { field: 'MyGroup[0].Name', componentId: 'name', rowIndexes: [0], customTextKey: 'with-field' },
      { componentId: 'name', rowIndexes: [1], customTextKey: 'without-field' },
    ]);
    expect(validations).toEqual(['name-0:with-field:simpleBinding', 'name-1:without-field:-']);
  });

  it('shows validations on the linked row of a component in a nested repeating group, outermost row first', async () => {
    const validations = await render([
      { field: 'MyGroup[1].Inner[0].Value', componentId: 'value', rowIndexes: [1, 0], customTextKey: 'with-field' },
      { componentId: 'value', rowIndexes: [1, 1], customTextKey: 'without-field' },
    ]);
    expect(validations).toEqual(['value-1-0:with-field:simpleBinding', 'value-1-1:without-field:-']);
  });

  it('shows a validation linked to a component on that component even when it does not bind the field', async () => {
    const validations = await render([{ field: 'SomeOtherField', componentId: 'first', customTextKey: 'other' }]);
    expect(validations).toEqual(['first:other:-']);
  });
});
