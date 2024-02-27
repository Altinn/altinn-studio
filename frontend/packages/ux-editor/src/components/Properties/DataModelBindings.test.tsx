import React from 'react';
import { screen } from '@testing-library/react';
import { DataModelBindings } from './DataModelBindings';
import { FormItemContext } from '../../containers/FormItemContext';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentSchemaMocks } from '../../testing/componentSchemaMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormItem } from '../../types/FormItem';
import { componentMocks } from '../../testing/componentMocks';
import { component3IdMock, component3Mock, layoutMock } from '../../testing/layoutMock';

describe('DataModelBindings', () => {
  afterEach(jest.clearAllMocks);

  it('renders EditDataModelBindings component when schema is present', () => {
    render({});

    const datamodelButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_title.Input`),
    });
    expect(datamodelButton).toBeInTheDocument();
  });

  it('does not render EditDataModelBindings component when schema.properties is undefined', () => {
    const unknownComponent: FormItem = {
      id: 'unknownComponentId',
      type: 'unknown' as any,
      itemType: 'COMPONENT',
      propertyPath: 'definitions/unknownComponent',
    };
    render({ props: { formItem: unknownComponent, formItemId: 'unknownComponentId' } });

    const spinner = screen.getByText(textMock('general.loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('should render alert component with information when component does not have any data model bindings to set', () => {
    render({
      props: {
        formItem: componentMocks[ComponentType.Image],
        formItemId: componentMocks[ComponentType.Image].id,
      },
    });

    const noDataModelBindingsAlert = screen.getByText(
      textMock('ux_editor.modal_properties_data_model_binding_not_present'),
    );
    expect(noDataModelBindingsAlert).toBeInTheDocument();
  });

  it('should render alert component with information when attachment component exist inside a repeating group component', () => {
    render({
      props: {
        formItem: component3Mock,
        formItemId: component3IdMock,
      },
    });

    const attachmentComponentInsideRepGroupAlert = screen.getByText(
      textMock('ux_editor.modal_properties_data_model_restrictions_attachment_components'),
    );
    expect(attachmentComponentInsideRepGroupAlert).toBeInTheDocument();
  });

  const { dataModelBindings } = componentSchemaMocks[ComponentType.AddressComponent].properties;
  it.each(Object.keys(dataModelBindings?.properties))(
    'should render data model binding with label for prop, %s, on AddressComponent',
    (prop) => {
      render({
        props: {
          formItem: componentMocks[ComponentType.AddressComponent],
          formItemId: componentMocks[ComponentType.AddressComponent].id,
        },
      });

      const datamodelButton = screen.getByRole('button', {
        name: textMock(`ux_editor.modal_properties_data_model_label.${prop}`),
      });
      expect(datamodelButton).toBeInTheDocument();
    },
  );

  it('should render already existing bindings in previewMode with label', () => {
    render({
      props: {
        formItem: {
          ...componentMocks[ComponentType.AddressComponent],
          dataModelBindings: {
            address: 'someAddressDataModelField',
            careOf: 'someCareOfDataModelField',
          },
        },
        formItemId: componentMocks[ComponentType.AddressComponent].id,
      },
    });

    ['address', 'careOf'].forEach((prop) => {
      const datamodelButton = screen.getByText(
        textMock(`ux_editor.modal_properties_data_model_label.${prop}`),
      );
      expect(datamodelButton).toBeInTheDocument();
    });

    ['zipCode', 'postPlace', 'houseNumber'].forEach((prop) => {
      const datamodelButton = screen.getByRole('button', {
        name: textMock(`ux_editor.modal_properties_data_model_label.${prop}`),
      });
      expect(datamodelButton).toBeInTheDocument();
    });
  });
});

const defaultProps = {
  formItemId: componentMocks[ComponentType.Input].id,
  formItem: componentMocks[ComponentType.Input],
};

const render = async ({
  props = defaultProps,
}: {
  props?: Partial<FormItemContext>;
  editId?: string;
}) => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, 'org', 'app', 'test-layout-set'], {
    default: layoutMock,
  });
  queryClientMock.setQueryData(
    [QueryKey.FormComponent, props.formItem.type],
    componentSchemaMocks[props.formItem.type],
  );
  return renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...props,
      }}
    >
      <DataModelBindings />
    </FormItemContext.Provider>,
  );
};
