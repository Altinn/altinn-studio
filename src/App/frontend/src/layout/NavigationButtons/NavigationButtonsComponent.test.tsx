import React from 'react';

import { PageValidation } from '@app/layout-contract/generated/common.generated';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CompNavigationButtonsExternal } from '@app/layout-contract/generated/components/NavigationButtons/config.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { Form } from 'src/components/form/Form';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

interface RenderProps extends Omit<Partial<RenderGenericComponentTestProps<'NavigationButtons'>>, 'component'> {
  component: CompNavigationButtonsExternal;
  currentPageId?: 'layout1' | 'layout2';
  pageValidation?: PageValidation;
  taskValidation?: PageValidation;
  appValidation?: PageValidation;
  formDataOverride?: object;
  inputRequired?: boolean;
}

describe('NavigationButtons', () => {
  const navButton1: CompNavigationButtonsExternal = {
    id: 'nav-button1',
    type: 'NavigationButtons',
    textResourceBindings: {},
  };
  const navButton2: CompNavigationButtonsExternal = {
    id: 'nav-button2',
    type: 'NavigationButtons',
    showBackButton: true,
    textResourceBindings: {},
  };

  const navButtonWithoutBackButton: CompNavigationButtonsExternal = {
    id: 'nav-button-without-back-button',
    type: 'NavigationButtons',
    showBackButton: false,
    textResourceBindings: {},
  };

  const navButton3: CompNavigationButtonsExternal = {
    id: 'nav-button3',
    type: 'NavigationButtons',
    showBackButton: true,
    textResourceBindings: {},
    validateOnNext: { page: 'all', show: ['CustomBackend'] },
  };

  const render = async ({
    component,
    genericProps,
    currentPageId = 'layout1',
    pageValidation,
    taskValidation,
    appValidation,
    formDataOverride,
    inputRequired = false,
  }: RenderProps) => {
    window.altinnAppGlobalData.ui = getUiConfigMock((obj) => {
      obj.folders.Task_1.pages = { order: ['layout1', 'layout2'], validationOnNavigation: taskValidation };
      obj.settings = { ...obj.settings, validationOnNavigation: appValidation };
    });

    window.altinnAppGlobalData.textResources = {
      language: 'nb',
      resources: [
        { id: 'layout1', value: 'First page' },
        { id: 'layout2', value: 'Second page' },
      ],
    };

    return await renderGenericComponentTest({
      type: 'NavigationButtons',
      renderer: () => <Form />,
      component,
      genericProps,
      initialPage: currentPageId,
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            if (formDataOverride) {
              obj.dataModels[defaultDataTypeMock].initialData = formDataOverride;
            }
            obj.layouts = {
              layout1: {
                data: {
                  layout: [
                    {
                      type: 'Input',
                      id: 'mockId1',
                      dataModelBindings: {
                        simpleBinding: { dataType: defaultDataTypeMock, field: 'mockDataBinding1' },
                      },
                      readOnly: false,
                      required: inputRequired,
                      textResourceBindings: { title: 'Required value' },
                    },
                    ...(currentPageId === 'layout1' ? [component] : []),
                  ],
                  ...(pageValidation && { validationOnNavigation: pageValidation }),
                },
              },
              layout2: {
                data: {
                  layout: [
                    {
                      type: 'Input',
                      id: 'mockId2',
                      dataModelBindings: {
                        simpleBinding: { dataType: defaultDataTypeMock, field: 'mockDataBinding2' },
                      },
                      readOnly: false,
                      required: inputRequired,
                      textResourceBindings: { title: 'Required value' },
                    },
                    ...(currentPageId === 'layout2' ? [component] : []),
                  ],
                  ...(pageValidation && { validationOnNavigation: pageValidation }),
                },
              },
            };
          }),
      },
    });
  };

  test('renders default NavigationButtons component', async () => {
    await render({ component: navButton1, currentPageId: 'layout2' });

    expect(await screen.findByText('Forrige')).toBeInTheDocument();
  });

  test('does not render back button when explicitly disabled', async () => {
    await render({ component: navButtonWithoutBackButton, currentPageId: 'layout2' });

    expect(screen.queryByText('Forrige')).not.toBeInTheDocument();
  });

  test('renders NavigationButtons component without back button if there is no previous page', async () => {
    await render({
      component: navButton2,
    });

    expect(screen.getByText('Neste')).toBeInTheDocument();
    expect(screen.queryByText('Forrige')).toBeNull();
  });

  test('renders NavigationButtons component with back button if there is a previous page', async () => {
    await render({ component: navButton2, currentPageId: 'layout2' });

    expect(screen.getByText('Forrige')).toBeInTheDocument();
  });

  const requiredValidation: PageValidation = { page: 'current', show: ['Required'] };
  const customValidation: PageValidation = { page: 'current', show: ['CustomBackend'] };
  const validationSources = [
    { level: 'page', pageValidation: requiredValidation },
    { level: 'task', taskValidation: requiredValidation },
    { level: 'app', appValidation: requiredValidation },
  ];

  test.each(validationSources)('inherits $level validation when no forward setting is supplied', async (source) => {
    await render({ ...source, component: navButton1, formDataOverride: {}, inputRequired: true });

    await userEvent.click(screen.getByText('Neste'));

    await screen.findByTestId('ErrorReport');
    await waitFor(() => expect(screen.getByText('Neste').closest('button')).not.toBeDisabled());
    expect(screen.getByText('Neste')).toBeInTheDocument();
  });

  test.each(validationSources)('component validation can relax $level validation', async (source) => {
    await render({ ...source, component: navButton3, formDataOverride: {}, inputRequired: true });

    await userEvent.click(screen.getByText('Neste'));

    await waitFor(() => expect(screen.queryByText('Neste')).not.toBeInTheDocument());
  });

  test.each([
    { level: 'page', pageValidation: customValidation },
    { level: 'task', taskValidation: customValidation },
    { level: 'app', appValidation: customValidation },
  ])('component validation can tighten $level validation', async (source) => {
    await render({
      ...source,
      component: { ...navButton1, validateOnNext: requiredValidation },
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('Neste'));

    await screen.findByTestId('ErrorReport');
    await waitFor(() => expect(screen.getByText('Neste').closest('button')).not.toBeDisabled());
    expect(screen.getByText('Neste')).toBeInTheDocument();
  });

  test.each(validationSources)('explicit backward validation is honored with $level defaults', async (source) => {
    await render({
      ...source,
      component: { ...navButton2, validateOnPrevious: requiredValidation },
      currentPageId: 'layout2',
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('Forrige'));

    await screen.findByTestId('ErrorReport');
    await waitFor(() => expect(screen.getByText('Forrige').closest('button')).not.toBeDisabled());
    expect(screen.getByText('Forrige')).toBeInTheDocument();
  });

  test.each(validationSources)('does not inherit $level validation for backward navigation', async (source) => {
    await render({
      ...source,
      component: navButton2,
      currentPageId: 'layout2',
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('Forrige'));

    await waitFor(() => expect(screen.queryByText('Forrige')).not.toBeInTheDocument());
  });

  test('button validation is used when page has no validation config', async () => {
    await render({
      component: navButton3,
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('Neste'));

    await waitFor(() => expect(screen.queryByText('Neste')).not.toBeInTheDocument());
  });
});
