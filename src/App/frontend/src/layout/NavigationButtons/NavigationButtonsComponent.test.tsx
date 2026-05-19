import React from 'react';

import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { PageValidation } from 'src/layout/common.generated';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompNavigationButtonsExternal } from 'src/layout/NavigationButtons/config.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

interface RenderProps extends Omit<Partial<RenderGenericComponentTestProps<'NavigationButtons'>>, 'component'> {
  component: CompNavigationButtonsExternal;
  currentPageId?: 'layout1' | 'layout2';
  pageValidation?: PageValidation;
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
    formDataOverride,
    inputRequired = false,
  }: RenderProps) => {
    window.altinnAppGlobalData.ui = getUiConfigMock(
      (obj) => (obj.folders.Task_1.pages = { order: ['layout1', 'layout2'] }),
    );

    return await renderGenericComponentTest({
      type: 'NavigationButtons',
      renderer: (props) => <NavigationButtonsComponent {...props} />,
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
                      textResourceBindings: {},
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
                      textResourceBindings: {},
                    },
                    ...(currentPageId === 'layout2' ? [component] : []),
                  ],
                },
              },
            };
          }),
      },
    });
  };

  test('renders default NavigationButtons component', async () => {
    await render({
      component: navButton1,
    });

    expect(await screen.findByText('next')).toBeInTheDocument();
    expect(screen.queryByText('back')).not.toBeInTheDocument();
  });

  test('renders NavigationButtons component without back button if there is no previous page', async () => {
    await render({
      component: navButton2,
    });

    expect(screen.getByText('next')).toBeInTheDocument();
    expect(screen.queryByText('back')).toBeNull();
  });

  test('renders NavigationButtons component with back button if there is a previous page', async () => {
    await render({ component: navButton2, currentPageId: 'layout2' });

    expect(screen.getByText('back')).toBeInTheDocument();
  });

  test('uses page validation when button has no validation config', async () => {
    await render({
      component: navButton1,
      pageValidation: { page: 'current', show: ['Required'] },
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('next'));

    await waitFor(() => expect(screen.getByText('next').closest('button')).not.toBeDisabled());

    expect(screen.getByText('next')).toBeInTheDocument();
  });

  test('page validation overrides button validation', async () => {
    await render({
      component: navButton3,
      pageValidation: { page: 'current', show: ['Required'] },
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('next'));

    await waitFor(() => expect(screen.getByText('next').closest('button')).not.toBeDisabled());

    expect(screen.getByText('next')).toBeInTheDocument();
  });

  test('button validation is used when page has no validation config', async () => {
    await render({
      component: navButton3,
      formDataOverride: {},
      inputRequired: true,
    });

    await userEvent.click(screen.getByText('next'));

    await waitForElementToBeRemoved(() => screen.queryByText('next'));

    expect(screen.queryByText('next')).not.toBeInTheDocument();
  });
});
