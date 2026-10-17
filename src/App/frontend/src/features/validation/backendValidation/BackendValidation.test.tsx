import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId, getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { Form } from 'src/components/form/Form';
import { type BackendValidationIssue, BackendValidationSeverity } from 'src/features/validation';
import { useUpdateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IDataModelMultiPatchResponse } from 'src/features/formData/types';

function makeIssue(field: string, text: string, source: string): BackendValidationIssue {
  return {
    customTextKey: text,
    field,
    dataElementId: defaultMockDataElementId,
    severity: BackendValidationSeverity.Error,
    source,
  };
}

function makeSaveResponse(
  data: object,
  validationIssues: IDataModelMultiPatchResponse['validationIssues'],
): IDataModelMultiPatchResponse {
  return {
    newDataModels: [{ dataElementId: defaultMockDataElementId, data }],
    validationIssues,
    instance: getInstanceDataMock(),
  };
}

// Saving attachment tags updates the validations from the validators that ran on that save
function SaveAttachmentTags() {
  const updateIncrementalValidations = useUpdateIncrementalValidations();
  return (
    <button
      onClick={() =>
        updateIncrementalValidations({
          AttachmentValidator: [makeIssue('Email', 'Missing attachment', 'AttachmentValidator')],
        })
      }
    >
      Save attachment tags
    </button>
  );
}

describe('BackendValidation', () => {
  const render = async () =>
    await renderWithInstanceAndLayout({
      renderer: () => (
        <>
          <Form />
          <SaveAttachmentTags />
        </>
      ),
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = {
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
            };
          }),
      },
    });

  it('should keep errors from a validator that did not run on the last save', async () => {
    const user = userEvent.setup();
    const { mutations } = await render();

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '123');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(1));
    mutations.doPatchMultipleFormData.resolve({
      data: makeSaveResponse({ PhoneNumber: '123' }, [
        {
          source: 'PhoneNumberValidator',
          issues: [makeIssue('PhoneNumber', 'Invalid phone number', 'PhoneNumberValidator')],
        },
      ]),
    });
    await screen.findAllByText('Invalid phone number');

    // Only the email validator runs when the email changes
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'ola');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(2));
    mutations.doPatchMultipleFormData.resolve({
      data: makeSaveResponse({ PhoneNumber: '123', Email: 'ola' }, [
        { source: 'EmailValidator', issues: [makeIssue('Email', 'Invalid email', 'EmailValidator')] },
      ]),
    });
    await screen.findAllByText('Invalid email');

    expect(screen.getAllByText('Invalid phone number')[0]).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInvalid();
  });

  it('should keep errors from earlier saves when attachment tags are saved', async () => {
    const user = userEvent.setup();
    const { mutations } = await render();

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '123');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(1));
    mutations.doPatchMultipleFormData.resolve({
      data: makeSaveResponse({ PhoneNumber: '123' }, [
        {
          source: 'PhoneNumberValidator',
          issues: [makeIssue('PhoneNumber', 'Invalid phone number', 'PhoneNumberValidator')],
        },
      ]),
    });
    await screen.findAllByText('Invalid phone number');

    await user.click(screen.getByRole('button', { name: 'Save attachment tags' }));
    await screen.findAllByText('Missing attachment');

    expect(screen.getAllByText('Invalid phone number')[0]).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInvalid();
  });

  it('should remove errors from a validator that ran on the last save and found none', async () => {
    const user = userEvent.setup();
    const { mutations } = await render();

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '123');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(1));
    mutations.doPatchMultipleFormData.resolve({
      data: makeSaveResponse({ PhoneNumber: '123' }, [
        {
          source: 'PhoneNumberValidator',
          issues: [makeIssue('PhoneNumber', 'Invalid phone number', 'PhoneNumberValidator')],
        },
      ]),
    });
    await screen.findAllByText('Invalid phone number');

    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '45678');
    await user.tab();
    await waitFor(() => expect(mutations.doPatchMultipleFormData.mock).toHaveBeenCalledTimes(2));
    mutations.doPatchMultipleFormData.resolve({
      data: makeSaveResponse({ PhoneNumber: '12345678' }, [{ source: 'PhoneNumberValidator', issues: [] }]),
    });

    await waitFor(() => expect(screen.queryByText('Invalid phone number')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeValid();
  });
});
