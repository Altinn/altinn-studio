import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { Form } from 'src/components/form/Form';
import {
  type BackendValidationIssue,
  BackendValidationSeverity,
  ValidationIssueSources,
} from 'src/features/validation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('ErrorReport', () => {
  const render = async (validationIssues: BackendValidationIssue[] = []) =>
    await renderWithInstanceAndLayout({
      initialPage: 'submit',
      renderer: () => <Form />,
      queries: {
        fetchBackendValidations: async () => validationIssues,
        fetchLayoutSettings: async () => ({
          pages: {
            order: ['form', 'submit'],
          },
        }),
        fetchLayouts: async () => ({
          form: {
            data: {
              layout: [
                {
                  id: 'input',
                  type: 'Input',
                  dataModelBindings: {
                    simpleBinding: 'boundField',
                  },
                },
              ],
            },
          },
          submit: {
            data: {
              layout: [
                {
                  id: 'submit',
                  type: 'Button',
                  textResourceBindings: {
                    title: 'Submit',
                  },
                },
              ],
            },
          },
        }),
      },
    });

  it('should not render when there are no errors', async () => {
    await render();
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
  });

  it('should list unmapped errors as unclickable', async () => {
    await render([
      {
        code: 'some unmapped error',
        severity: BackendValidationSeverity.Error,
      } as BackendValidationIssue,
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    // Unmapped errors should not be clickable
    const errorNode = screen.getByText('some unmapped error');
    expect(errorNode).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.tagName).toEqual('LI');
  });

  it('should list unbound mapped error as unclickable', async () => {
    await render([
      {
        customTextKey: 'some unbound mapped error',
        field: 'unboundField',
        severity: BackendValidationSeverity.Error,
        source: ValidationIssueSources.Custom,
      } as BackendValidationIssue,
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    // mapped errors not bound to any component should not be clickable
    const errorNode = screen.getByText('some unbound mapped error');
    expect(errorNode).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.tagName).toEqual('LI');
  });

  it('should list mapped error as clickable', async () => {
    await render([
      {
        customTextKey: 'some mapped error',
        field: 'boundField',
        severity: BackendValidationSeverity.Error,
        source: ValidationIssueSources.Custom,
      } as BackendValidationIssue,
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

    const errorNode = screen.getByText('some mapped error');
    expect(errorNode).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.tagName).toEqual('BUTTON');
    // eslint-disable-next-line testing-library/no-node-access
    expect(errorNode.parentElement?.parentElement?.tagName).toEqual('LI');
  });
});
