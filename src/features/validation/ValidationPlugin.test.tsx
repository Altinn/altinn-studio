import React, { useEffect, useState } from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { type BackendValidationIssue, BackendValidationSeverity } from '.';

import { defaultMockDataElementId } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { Form } from 'src/components/form/Form';
import { FD } from 'src/features/formData/FormDataWrite';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { AllowedValidationMasks } from 'src/layout/common.generated';

function FormDataValue() {
  const formDataValue = FD.useDebouncedPick({ dataType: defaultDataTypeMock, field: 'TextField' });
  const [delayedValue, setDelayedValue] = useState(formDataValue);

  // This will ensure that the validation state gets updated in the error report by the time this value gets written to the DOM
  useEffect(() => {
    setDelayedValue(formDataValue);
  }, [formDataValue]);

  return <div data-testid='formDataValue'>{delayedValue ? delayedValue.toString() : '<empty>'}</div>;
}

describe('ValidationPlugin', () => {
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
      return renderWithInstanceAndLayout({
        renderer: () => (
          <>
            <Form />
            <FormDataValue />
          </>
        ),
        initialPage: 'Form',
        queries: {
          fetchFormData: () =>
            Promise.resolve({
              TextField: text,
            }),
          fetchBackendValidations: () =>
            Promise.resolve(
              backendValidations.map(
                (text) =>
                  ({
                    customTextKey: text,
                    field: 'TextField',
                    dataElementId: defaultMockDataElementId,
                    severity: BackendValidationSeverity.Error,
                    source: 'Custom',
                  }) as BackendValidationIssue,
              ),
            ),
          fetchDataModelSchema: () =>
            Promise.resolve({
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
            }),
          fetchLayoutSettings: () => Promise.resolve({ pages: { order: ['Form', 'NextPage'] } }),
          fetchTextResources: async () => ({
            language: 'nb',
            resources: [
              {
                id: 'Form',
                value: 'This is a page title',
              },
              {
                id: 'NextPage',
                value: 'This is the next page title',
              },
            ],
          }),
          fetchLayouts: () =>
            Promise.resolve({
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

      const ErrorReport = screen.getByTestId('ErrorReport');
      expect(within(ErrorReport).getByText(/bruk 10 eller færre tegn/i)).toBeInTheDocument();
      expect(within(ErrorReport).queryByText(/du må fylle ut text/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      await screen.findByText(/this is the second page!/i);

      await waitFor(() =>
        expect(within(screen.getByTestId('ErrorReport')).getByText(/bruk 10 eller færre tegn/i)).toBeInTheDocument(),
      );
      await waitFor(() =>
        expect(within(screen.getByTestId('ErrorReport')).queryByText(/du må fylle ut text/i)).not.toBeInTheDocument(),
      );
    });

    it('validation on navigating to next page should not remove visibility existing in showValidations, but add to them', async () => {
      await render({
        text: 'this is too long',
        showValidations: ['CustomBackend'],
        validateOnNext: ['Schema'],
        backendValidations: ['Backend says this is wrong'],
      });

      const ErrorReport = screen.getByTestId('ErrorReport');
      expect(within(ErrorReport).getByText(/Backend says this is wrong/i)).toBeInTheDocument();
      expect(within(ErrorReport).queryByText(/bruk 10 eller færre tegn/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => expect(within(ErrorReport).getByText(/bruk 10 eller færre tegn/i)).toBeInTheDocument());
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
  });
});
