import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { Form } from 'src/components/form/Form';
import { type BackendValidationIssue, BackendValidationSeverity } from 'src/features/validation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

function makeIssue(field: string, text: string, source: string): BackendValidationIssue {
  return {
    customTextKey: text,
    field,
    dataElementId: defaultMockDataElementId,
    severity: BackendValidationSeverity.Error,
    source,
  };
}

describe('BackendValidation', () => {
  const render = async () =>
    await renderWithInstanceAndLayout({
      renderer: () => <Form />,
      queries: {
        fetchFormData: async () => ({}),
        fetchBackendValidations: async () => [],
        fetchLayouts: async () => ({
          FormLayout: {
            data: {
              layout: [
                {
                  id: 'phoneNumber',
                  type: 'Input',
                  textResourceBindings: { title: 'Phone number' },
                  dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'PhoneNumber' } },
                },
                {
                  id: 'email',
                  type: 'Input',
                  textResourceBindings: { title: 'Email' },
                  dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'Email' } },
                },
              ],
            },
          },
        }),
      },
    });

  it('should keep errors from a validator that did not run on the last save', async () => {
    const user = userEvent.setup();
    const { mutations } = await render();

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '123');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));
    mutations.doPatchFormData.resolve({
      data: {
        newDataModel: { PhoneNumber: '123' },
        validationIssues: {
          PhoneNumberValidator: [makeIssue('PhoneNumber', 'Invalid phone number', 'PhoneNumberValidator')],
        },
      },
    });
    await screen.findAllByText('Invalid phone number');

    // Only the email validator runs when the email changes
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ola');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(2));
    mutations.doPatchFormData.resolve({
      data: {
        newDataModel: { PhoneNumber: '123', Email: 'ola' },
        validationIssues: {
          EmailValidator: [makeIssue('Email', 'Invalid email', 'EmailValidator')],
        },
      },
    });
    await screen.findAllByText('Invalid email');

    expect(screen.getAllByText('Invalid phone number')[0]).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInvalid();
  });

  it('should remove errors from a validator that ran on the last save and found none', async () => {
    const user = userEvent.setup();
    const { mutations } = await render();

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '123');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));
    mutations.doPatchFormData.resolve({
      data: {
        newDataModel: { PhoneNumber: '123' },
        validationIssues: {
          PhoneNumberValidator: [makeIssue('PhoneNumber', 'Invalid phone number', 'PhoneNumberValidator')],
        },
      },
    });
    await screen.findAllByText('Invalid phone number');

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '45678');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(2));
    mutations.doPatchFormData.resolve({
      data: {
        newDataModel: { PhoneNumber: '12345678' },
        validationIssues: { PhoneNumberValidator: [] },
      },
    });

    await waitFor(() => expect(screen.queryByText('Invalid phone number')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeValid();
  });
});
