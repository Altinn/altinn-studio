import React from 'react';
import { DefinedBinding, type DefinedBindingProps } from './DefinedBinding';
import { renderWithProviders } from '../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { DataModelMetadataResponse } from 'app-shared/types/api/DataModelMetadataResponse';

const dataModelMetadata: DataModelMetadataResponse = {
  elements: {
    defaultModel: {
      id: 'defaultModel',
      type: 'ComplexType',
      dataBindingName: null,
      displayString: 'defaultModel',
      isReadOnly: false,
      isTagContent: false,
      jsonSchemaPointer: '#/definitions/defaultModel',
      maxOccurs: 1,
      minOccurs: 1,
      name: 'defaultModel',
      parentElement: null,
      restrictions: [],
      texts: [],
      xmlSchemaXPath: '/defaultModel',
      xPath: '/defaultModel',
    },
    'defaultModel.field1': {
      id: 'defaultModel.field1',
      type: 'SimpleType',
      dataBindingName: 'field1',
      displayString: 'defaultModel.field1',
      isReadOnly: false,
      isTagContent: false,
      jsonSchemaPointer: '#/definitions/defaultModel/properties/field1',
      maxOccurs: 1,
      minOccurs: 1,
      name: 'field1',
      parentElement: 'defaultModel',
      restrictions: [],
      texts: [],
      xmlSchemaXPath: '/defaultModel/field1',
      xPath: '/defaultModel/field1',
    },
  },
};

const defaultComponent: DefinedBindingProps = {
  label: 'label',
  onClick: jest.fn(),
  internalBindingFormat: {
    field: 'field',
    dataType: 'binding',
  },
  componentType: ComponentType.Input,
  bindingKey: 'bindingKey',
};

type RenderDefinedBinding = {
  component: DefinedBindingProps;
  queryClient?: QueryClient;
  queries?: Partial<ServicesContextProps>;
};

const renderDefinedBinding = ({
  component = defaultComponent,
  queryClient = createQueryClientMock(),
  queries,
}: RenderDefinedBinding) => {
  return {
    ...renderWithProviders(<DefinedBinding {...component} />, {
      queries: { ...queries },
      queryClient,
    }),
  };
};

describe('DefinedBinding', () => {
  const getAppMetadataModelIdsMock = jest
    .fn()
    .mockImplementation(() => Promise.resolve(['defaultModel']));
  const getDataModelMetadataMock = jest
    .fn()
    .mockImplementation(() => Promise.resolve(dataModelMetadata));

  it('should render loading spinner', async () => {
    renderDefinedBinding({
      component: defaultComponent,
      queries: {
        getDataModelMetadata: getDataModelMetadataMock,
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
      },
    });
    const loadingSpinner = screen.getByTitle(textMock('ux_editor.modal_properties_loading'));
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should render edit button with the binding selected', async () => {
    renderDefinedBinding({
      component: defaultComponent,
      queries: {
        getDataModelMetadata: getDataModelMetadataMock,
        getAppMetadataModelIds: getAppMetadataModelIdsMock,
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const editButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: 'label' }),
    });
    expect(editButton).toBeInTheDocument();

    const editButtonText = within(editButton).getByText('field');
    expect(editButtonText).toBeInTheDocument();
  });
});
