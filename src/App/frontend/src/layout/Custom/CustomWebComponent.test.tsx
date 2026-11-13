import React from 'react';

import { fireEvent, screen, waitFor } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { CustomWebComponent } from 'src/layout/Custom/CustomWebComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const jsonAttributeValue = { customKey: 'customValue' };

describe('CustomWebComponent', () => {
  beforeEach(() => {
    window.altinnAppGlobalData.textResources!.resources = [{ id: 'title', value: 'Title' }];
  });

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

  describe('with bindings to objects and lists', () => {
    const initialData = {
      property: { address: 'Testveien 1', number: 12 },
      owners: [{ name: 'Ola' }, { name: 'Kari' }],
      title: 'A title',
    };
    const component = {
      tagName: 'test-component',
      dataModelBindings: {
        property: { dataType: defaultDataTypeMock, field: 'property' },
        owners: { dataType: defaultDataTypeMock, field: 'owners' },
        title: { dataType: defaultDataTypeMock, field: 'title' },
      },
    };
    const queries = {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.dataModels[defaultDataTypeMock].initialData = initialData;
        }),
    };

    it('passes the data as it is in the data model in summary mode', async () => {
      await renderGenericComponentTest({
        type: 'Custom',
        renderer: (props) => (
          <CustomWebComponent
            {...props}
            summaryMode={true}
          />
        ),
        component,
        queries,
      });
      const element = screen.getByTestId('test-component');
      expect(Reflect.get(element, 'formData')).toEqual(initialData);
    });

    it('passes the data as strings outside summary mode', async () => {
      await renderGenericComponentTest({
        type: 'Custom',
        renderer: (props) => <CustomWebComponent {...props} />,
        component,
        queries,
      });
      const element = screen.getByTestId('test-component');
      expect(Reflect.get(element, 'formData')).toEqual({ property: '', owners: '', title: 'A title' });
    });
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
