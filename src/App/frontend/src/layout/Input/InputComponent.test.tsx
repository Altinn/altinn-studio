import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { BackendValidationSeverity, ValidationMask } from 'src/features/validation';
import { InputComponent } from 'src/layout/Input/InputComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('InputComponent', () => {
  it.each([
    { severity: BackendValidationSeverity.Error, hasError: true },
    { severity: BackendValidationSeverity.Warning, hasError: false },
    { severity: BackendValidationSeverity.Informational, hasError: false },
  ])(
    'uses visible backend severity $severity for accessibility and the error state',
    async ({ severity, hasError }) => {
      await render({
        component: {
          textResourceBindings: { title: 'Input label' },
        },
        queries: {
          fetchFormBootstrapForInstance: async () =>
            getFormBootstrapMock((obj) => {
              obj.dataModels[defaultDataTypeMock].initialData = { some: { field: 'value' } };
              obj.dataModels[defaultDataTypeMock].initialValidationIssues = [
                {
                  customTextKey: 'Backend validation message',
                  field: 'some.field',
                  dataElementId: defaultMockDataElementId,
                  severity,
                  source: 'Custom',
                },
              ];
            }),
        },
      });

      const input = screen.getByRole('textbox');
      expect(screen.getByText('Backend validation message')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('mock-id-validations'));
      if (hasError) {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      } else {
        expect(input).not.toHaveAttribute('aria-invalid', 'true');
      }
    },
  );

  it('updates the error state and accessibility when required validations become visible', async () => {
    function ShowRequiredValidations() {
      const setFormMask = FormStore.raw.useSelector((state) => state.validation.setFormMask);
      return <button onClick={() => setFormMask(ValidationMask.Required)}>Show required validations</button>;
    }

    await render({
      component: {
        required: true,
        showValidations: [],
        textResourceBindings: { title: 'Input label' },
      },
      renderer: (props) => (
        <>
          <InputComponent {...props} />
          <ShowRequiredValidations />
        </>
      ),
    });

    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(input).not.toHaveAttribute('aria-describedby');

    await userEvent.click(screen.getByRole('button', { name: 'Show required validations' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('mock-id-validations'));
  });

  it('updates the error state when masked backend validations are shown', async () => {
    function ShowBackendValidations() {
      const showAll = FormStore.raw.useSelector((state) => state.validation.setShowAllUnboundValidations);
      return <button onClick={() => showAll(true)}>Show backend validations</button>;
    }

    await render({
      component: {
        showValidations: ['Schema'],
        textResourceBindings: { title: 'Input label' },
      },
      renderer: (props) => (
        <>
          <InputComponent {...props} />
          <ShowBackendValidations />
        </>
      ),
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialValidationIssues = [
              {
                customTextKey: 'Backend validation message',
                field: 'some.field',
                dataElementId: defaultMockDataElementId,
                severity: BackendValidationSeverity.Error,
                source: 'Custom',
              },
            ];
          }),
      },
    });

    const input = screen.getByRole('textbox');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Backend validation message')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show backend validations' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('mock-id-validations'));
    expect(screen.getByText('Backend validation message')).toBeInTheDocument();
  });

  it('should correct value with no form data provided', async () => {
    await render();
    const inputComponent = screen.getByRole('textbox');

    expect(inputComponent).toHaveValue('');
  });

  it('should have correct value with specified form data', async () => {
    await render({
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = { some: { field: 'some value' } };
          }),
      },
    });
    const inputComponent = screen.getByRole('textbox') as HTMLInputElement;

    expect(inputComponent.value).toEqual('some value');
  });

  it('should have correct form data after user types in field', async () => {
    const typedValue = 'banana';
    await render();
    const inputComponent = screen.getByRole('textbox');

    await userEvent.type(inputComponent, typedValue);

    expect(inputComponent).toHaveValue(typedValue);
  });

  it('should call setLeafValue function after data change', async () => {
    const typedValue = 'test input';
    const { formDataMethods } = await render();
    const inputComponent = screen.getByRole('textbox');

    await userEvent.type(inputComponent, typedValue);

    expect(inputComponent).toHaveValue(typedValue);
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'some.field', dataType: defaultDataTypeMock },
      newValue: typedValue,
    });
    expect(inputComponent).toHaveValue(typedValue);
  });

  it('should render input with formatted number when this is specified', async () => {
    const inputValuePlainText = '123456';
    const inputValueFormatted = '$123,456';
    const typedValue = '789';
    const finalValuePlainText = `${inputValuePlainText}${typedValue}`;
    const finalValueFormatted = '$123,456,789';
    const { formDataMethods } = await render({
      component: {
        formatting: {
          number: {
            thousandSeparator: true,
            prefix: '$',
          },
        },
      },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = { some: { field: inputValuePlainText } };
          }),
      },
    });
    const inputComponent = screen.getByRole('textbox');
    expect(inputComponent).toHaveValue(inputValueFormatted);

    await userEvent.type(inputComponent, typedValue);
    await userEvent.tab();

    expect(inputComponent).toHaveValue(finalValueFormatted);
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'some.field', dataType: defaultDataTypeMock },
      newValue: finalValuePlainText,
      callback: expect.any(Function),
    });
  });

  it('should have description textResourceBindings title and description is present', async () => {
    await render({
      component: {
        textResourceBindings: {
          title: 'title',
          description: 'description',
        },
      },
    });

    expect(screen.getByRole('textbox', { description: 'description' })).toBeInTheDocument();
  });

  it('should not have description if description is not present', async () => {
    await render({
      component: {
        textResourceBindings: {
          title: 'title',
        },
      },
    });

    expect(screen.getByRole('textbox', { name: 'title' })).not.toHaveAttribute('aria-describedby');
  });

  it('should not have description if title is not present', async () => {
    await render({
      component: {
        textResourceBindings: {
          description: 'description',
        },
      },
    });

    const inputComponent = screen.queryByRole('textbox', { description: 'description' });
    expect(inputComponent).not.toBeInTheDocument();
  });

  it('should apply correct formatting to phone numbers when rendered as component', async () => {
    const typedValue = '44444444';
    const formattedValue = '+47 444 44 444';
    const { formDataMethods } = await render({
      component: {
        formatting: {
          number: {
            format: '+47 ### ## ###',
          },
        },
      },
    });
    const inputComponent = screen.getByRole('textbox');
    await userEvent.type(inputComponent, typedValue);
    expect(inputComponent).toHaveValue(formattedValue);
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'some.field', dataType: defaultDataTypeMock },
      newValue: typedValue,
    });
    expect(inputComponent).toHaveValue(formattedValue);
  });

  it('should allow decimal separators specified in allowedDecimalSeparators when typing', async () => {
    const typedValue = '11.1';
    const formattedValue = '11,1';
    const { formDataMethods } = await render({
      component: {
        formatting: {
          number: {
            allowedDecimalSeparators: [',', '.'],
            decimalSeparator: ',',
          },
        },
      },
    });
    const inputComponent = screen.getByRole('textbox');
    await userEvent.type(inputComponent, typedValue);
    expect(inputComponent).toHaveValue(formattedValue);
    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      reference: { field: 'some.field', dataType: defaultDataTypeMock },
      newValue: typedValue,
      callback: expect.any(Function),
    });
    expect(inputComponent).toHaveValue(formattedValue);
  });

  it('should prevent pasting when readOnly is true', async () => {
    const initialValue = 'initial value';
    await render({
      component: {
        readOnly: true,
      },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = { some: { field: initialValue } };
          }),
      },
    });

    const inputComponent = screen.getByRole('textbox') as HTMLInputElement;
    expect(inputComponent).toHaveValue(initialValue);

    await userEvent.click(inputComponent);

    await userEvent.paste('pasted text');

    expect(inputComponent).toHaveValue(initialValue);
  });

  it('should render autocomplete prop if provided', async () => {
    const initialValue = 'initial value';
    await render({
      component: {
        autocomplete: 'name',
      },
      queries: {
        fetchFormData: () => Promise.resolve({ some: { field: initialValue } }),
      },
    });

    const inputComponent = screen.getByRole('textbox') as HTMLInputElement;
    expect(inputComponent).toHaveAttribute('autocomplete', 'name');
  });

  const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'Input'>> = {}) =>
    await renderGenericComponentTest({
      type: 'Input',
      renderer: (props) => <InputComponent {...props} />,
      component: {
        id: 'mock-id',
        required: false,
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'some.field' },
        },
        ...component,
      },
      ...rest,
    });
});
