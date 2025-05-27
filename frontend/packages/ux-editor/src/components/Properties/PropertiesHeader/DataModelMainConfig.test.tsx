import React from 'react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../testing/mocks';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { DataModelMainConfig } from './DataModelMainConfig';
import { component1Mock } from '@altinn/ux-editor/testing/layoutMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { dataModelMetadataResponseMock } from '@altinn/ux-editor/testing/dataModelMock';
import { FormItemContext } from '@altinn/ux-editor/containers/FormItemContext';
import { formItemContextProviderMock } from '@altinn/ux-editor/testing/formItemContextMocks';

const mockHandleComponentUpdate = jest.fn();

const noBindingsRequired = undefined;
const simpleBindingRequired = ['simpleBinding'];
const multipleBindingsRequired = ['binding1', 'binding2', 'binding3'];

describe('DataModelMainConfig', () => {
  afterEach(() => jest.clearAllMocks());

  it('return null if there is no data model bindings required', () => {
    renderDataModelMainConfig({
      component: component1Mock,
      requiredDataModelBindings: noBindingsRequired,
    });
    const wrapper = screen.getByTestId('component-wrapper');
    expect(wrapper).toBeEmptyDOMElement();
  });

  it('renders when a single data model binding is required', async () => {
    renderDataModelMainConfig({
      component: component1Mock,
      requiredDataModelBindings: simpleBindingRequired,
    });

    const dataModelBindingButton = await screen.findByRole('button');
    expect(dataModelBindingButton).toBeInTheDocument();
  });

  it('renders when multiple data model bindings are required', async () => {
    renderDataModelMainConfig({
      component: component1Mock,
      requiredDataModelBindings: multipleBindingsRequired,
    });

    for (const prop of multipleBindingsRequired) {
      const propText = textMock(`ux_editor.modal_properties_data_model_label.${prop}`);
      const labelText = textMock('ux_editor.modal_properties_data_model_field_choose_for', {
        componentName: propText,
      });
      const dataModelBindingButton = await screen.findByRole('button', {
        name: labelText,
      });
      expect(dataModelBindingButton).toBeInTheDocument();
    }
  });

  it('updates data model binding when deleting the binding', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderDataModelMainConfig({
      component: component1Mock,
      requiredDataModelBindings: simpleBindingRequired,
    });

    const dataModelButton = await screen.findByRole('button');
    await user.click(dataModelButton);

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);

    expect(mockHandleComponentUpdate).toHaveBeenCalledWith({
      ...component1Mock,
      dataModelBindings: { simpleBinding: '' },
    });
  });
});

const renderDataModelMainConfig = ({
  component = component1Mock,
  requiredDataModelBindings = undefined,
}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadata, org, app], {
    dataTypes: [dataModelMetadataResponseMock.elements],
  });

  return renderWithProviders(
    <div data-testid='component-wrapper'>
      <FormItemContext.Provider value={formItemContextProviderMock}>
        <DataModelMainConfig
          component={component}
          requiredDataModelBindings={requiredDataModelBindings}
          handleComponentChange={mockHandleComponentUpdate}
        />
      </FormItemContext.Provider>
    </div>,
    { queryClient },
  );
};
