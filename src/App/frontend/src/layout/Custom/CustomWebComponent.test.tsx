import React from 'react';

import { act, fireEvent, screen, waitFor } from '@testing-library/react';

import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultMockDataElementId, getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { FormStore } from 'src/features/form/FormContext';
import { FormProvider } from 'src/features/form/FormProvider';
import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { SubformSummaryComponent2 } from 'src/layout/Subform/Summary/SubformSummaryComponent2';
import { renderGenericComponentTest, renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const jsonAttributeValue = { customKey: 'customValue' };

type TextResourcesProviderImport = typeof import('src/features/language/textResources/TextResourcesProvider');
vi.mock('src/features/language/textResources/TextResourcesProvider', async () => {
  const actual = await vi.importActual<TextResourcesProviderImport>(
    'src/features/language/textResources/TextResourcesProvider',
  );
  // The same object on every render, so that langTools stays the same between renders
  const textResources = { title: { value: 'Title' } };
  return {
    ...actual,
    useTextResources: vi.fn(() => textResources),
  };
});

describe('CustomWebComponent', () => {
  it('should render the component with the provided tag name', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
  });

  it('should stringify json values when passed to the dom', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('data-CustomAttributeWithJson')).toEqual(JSON.stringify(jsonAttributeValue));
    expect(element.getAttribute('data-CustomAttributeWithReact')).toEqual('<span>Hello world</span>');
  });

  it('should render the component with passed props as attributes', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(element.id).toEqual('test-component');
    expect(element.getAttribute('text')).toEqual('Title');
  });

  it('keeps live bindings when configuration contains React-reserved properties', async () => {
    const { formDataMethods } = await render({
      component: {
        tagName: 'test-component',
        ref: 'widget',
        key: 'widget-key',
        children: 'widget-children',
        dangerouslySetInnerHTML: { __html: '<span>widget-html</span>' },
        suppressHydrationWarning: true,
        suppressContentEditableWarning: true,
        widgetOption: 'forwarded',
      },
    });
    const element = screen.getByTestId('test-component');
    expect(element).toHaveAttribute('widgetOption', 'forwarded');
    expect(element).toBeEmptyDOMElement();
    expect(Reflect.get(element, 'dataModelBindings')).toHaveProperty('simpleBinding');
    expect(Reflect.get(element, 'formData')).toHaveProperty('simpleBinding');

    fireEvent(element, new CustomEvent('dataChanged', { detail: { value: 'Updated by widget' } }));

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: 'Updated by widget' }),
    );
    await waitFor(() => {
      expect(Reflect.get(element, 'formData')).toEqual({ simpleBinding: 'Updated by widget' });
    });
  });

  it('tells the element which data element each data type in the form has', async () => {
    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(Reflect.get(element, 'dataElementIds')).toEqual({ [defaultDataTypeMock]: defaultMockDataElementId });
  });

  it('tells a mounted element when the data element IDs change', async () => {
    // Changing the data models in the form store also changes langTools. Drive the data element IDs on their own, so
    // that no other dependency of the effect can make it run again.
    let dataElementIds: Record<string, string | null> = { [defaultDataTypeMock]: defaultMockDataElementId };
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    const spy = vi
      .spyOn(FormStore.bootstrap, 'useDataElementIds')
      .mockImplementation(() => React.useSyncExternalStore(subscribe, () => dataElementIds));
    onTestFinished(() => spy.mockRestore());

    await render({ component: { tagName: 'test-component' } });
    const element = screen.getByTestId('test-component');
    expect(Reflect.get(element, 'dataElementIds')).toEqual({ [defaultDataTypeMock]: defaultMockDataElementId });

    act(() => {
      dataElementIds = { [defaultDataTypeMock]: 'replaced-data-element' };
      listeners.forEach((listener) => listener());
    });

    expect(screen.getByTestId('test-component')).toBe(element);
    expect(Reflect.get(element, 'dataElementIds')).toEqual({ [defaultDataTypeMock]: 'replaced-data-element' });
  });

  it('tells an element in a subform entry the data element of that entry', async () => {
    await renderGenericComponentTest({
      type: 'Custom',
      renderer: (props) => (
        <FormProvider
          readOnly={true}
          uiFolderOverride='subform-layout'
          dataElementIdOverride='subform-entry-2'
        >
          <CustomWebComponent {...props} />
        </FormProvider>
      ),
      component: { id: 'test-component', tagName: 'test-component' },
      queries: {
        fetchFormBootstrapForInstance: async ({ uiFolder, dataElementId }) =>
          getFormBootstrapMock((obj) => {
            if (uiFolder === 'subform-layout') {
              obj.dataModels = { 'subform-data': getDataModelBootstrapMock({ dataElementId: dataElementId ?? null }) };
            }
          }),
      },
    });
    const element = await screen.findByTestId('test-component');
    expect(Reflect.get(element, 'dataElementIds')).toEqual({ 'subform-data': 'subform-entry-2' });
  });

  it('tells the element in each subform entry in a summary the data element of that entry', async () => {
    await renderWithInstanceAndLayout({
      renderer: () => <SubformSummaryComponent2 targetBaseComponentId='subform' />,
      queries: {
        fetchFormData: async () => ({}),
        fetchFormBootstrapForInstance: async ({ uiFolder, dataElementId }) =>
          getFormBootstrapMock((obj) => {
            if (uiFolder === 'subform-layout') {
              obj.layouts = {
                page1: { data: { layout: [{ id: 'custom', type: 'Custom', tagName: 'test-component' }] } },
              };
              obj.dataModels = { 'subform-data': getDataModelBootstrapMock({ dataElementId: dataElementId ?? null }) };
            } else {
              obj.layouts = {
                FormLayout: {
                  data: { layout: [{ id: 'subform', type: 'Subform', layoutSet: 'subform-layout', tableColumns: [] }] },
                },
              };
            }
          }),
      },
      apis: {
        instanceApi: {
          getInstance: async () => {
            const instance = getInstanceWithProcessMock();
            for (const id of ['subform-entry-1', 'subform-entry-2']) {
              instance.data.push({ ...instance.data[0], id, dataType: 'subform-data' });
            }
            return instance;
          },
        },
      },
    });
    const elements = await screen.findAllByTestId('test-component');
    expect(elements.map((element) => Reflect.get(element, 'dataElementIds'))).toEqual([
      { 'subform-data': 'subform-entry-1' },
      { 'subform-data': 'subform-entry-2' },
    ]);
  });

  it('should render nothing if the tag name is missing', async () => {
    await render({ component: { tagName: undefined } });
    const element = screen.queryByTestId('test-component');
    expect(element).not.toBeInTheDocument();
  });

  const render = async ({ component }: Partial<RenderGenericComponentTestProps<'Custom'>> = {}) =>
    await renderGenericComponentTest({
      type: 'Custom',
      renderer: (props) => <CustomWebComponent {...props} />,
      component: {
        id: 'test-component',
        tagName: '',
        dataModelBindings: { simpleBinding: 'model' },
        textResourceBindings: {
          title: 'title',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ 'data-CustomAttributeWithJson': jsonAttributeValue } as any),
        ...component,
      },
      genericProps: {
        isValid: true,
        shouldFocus: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ 'data-CustomAttributeWithReact': <span>Hello world</span> } as any),
      },
    });
});
