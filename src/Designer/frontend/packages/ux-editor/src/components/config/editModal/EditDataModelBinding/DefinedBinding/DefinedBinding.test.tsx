import React from 'react';
import { DefinedBinding, type DefinedBindingProps } from './DefinedBinding';
import { renderWithProviders } from '../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const label = 'label';
const dataModelField = 'field';
const dataModel = 'model';
const bindingKey = 'bindingKey';

const defaultDefinedBindingProps: DefinedBindingProps = {
  label,
  onClick: jest.fn(),
  internalBindingFormat: {
    field: dataModelField,
    dataType: dataModel,
  },
  componentType: ComponentType.Input,
  bindingKey,
};

type RenderDefinedBinding = {
  props?: Partial<DefinedBindingProps>;
  queryClient?: QueryClient;
  queries?: Partial<ServicesContextProps>;
};

const renderDefinedBinding = ({
  props,
  queryClient = createQueryClientMock(),
  queries,
}: RenderDefinedBinding = {}) => {
  return {
    ...renderWithProviders(<DefinedBinding {...defaultDefinedBindingProps} {...props} />, {
      queries,
      queryClient,
    }),
  };
};

describe('DefinedBinding', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading spinner', async () => {
    renderDefinedBinding();
    const loadingSpinnerTitle = textMock('ux_editor.modal_properties_loading');

    const loadingSpinner = screen.getByTitle(loadingSpinnerTitle);
    expect(loadingSpinner).toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.queryByTitle(loadingSpinnerTitle));
  });

  it('should render edit button with the binding selected', async () => {
    renderDefinedBinding();

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const editButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: label }),
    });
    expect(editButton).toBeInTheDocument();

    const editButtonText = within(editButton).getByText(dataModelField);
    expect(editButtonText).toBeInTheDocument();
  });

  it('should render edit button with the binding selected even with no data model selected', async () => {
    renderDefinedBinding({
      props: {
        internalBindingFormat: {
          field: dataModelField,
          dataType: '',
        },
      },
    });

    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );

    const editButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: label }),
    });
    expect(editButton).toBeInTheDocument();

    const editButtonText = within(editButton).getByText(dataModelField);
    expect(editButtonText).toBeInTheDocument();
  });

  it('should render with error css class when selected data model does not exist', async () => {
    renderWithDataModelAndMetadata('non-existent-model', dataModelField);
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );
    const editButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: label }),
    });
    expect(editButton).toHaveClass('error');
  });

  it('should render with error css class when selected data model field does not exist in model', async () => {
    renderWithDataModelAndMetadata(dataModel, 'non-existent-field');
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );
    const editButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: label }),
    });
    expect(editButton).toHaveClass('error');
  });

  it('should render without error css class when selected data model and field is valid', async () => {
    renderWithDataModelAndMetadata(dataModel, dataModelField);
    await waitForElementToBeRemoved(() =>
      screen.queryByTitle(textMock('ux_editor.modal_properties_loading')),
    );
    const editButton = screen.getByRole('button', {
      name: textMock('right_menu.data_model_bindings_edit', { binding: label }),
    });
    expect(editButton).not.toHaveClass('error');
  });
});

const renderWithDataModelAndMetadata = (modelName: string, fieldName: string) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadataModelIds, org, app, false], [modelName]);
  const getDataModelMetadata = jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ elements: { [fieldName]: { dataBindingName: fieldName, maxOccurs: 0 } } }),
    );
  renderDefinedBinding({ queries: { getDataModelMetadata }, queryClient });
};
