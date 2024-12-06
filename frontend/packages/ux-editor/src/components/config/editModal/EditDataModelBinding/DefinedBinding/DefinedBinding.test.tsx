import React from 'react';
import { DefinedBinding, type DefinedBindingProps } from './DefinedBinding';
import { renderWithProviders } from '../../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const label = 'label';
const dataModelField = 'field';
const dataModel = 'model';
const bindingKey = 'bindingKey';

const defaultDefinedBinding: DefinedBindingProps = {
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
  props?: DefinedBindingProps;
  queryClient?: QueryClient;
  queries?: Partial<ServicesContextProps>;
};

const renderDefinedBinding = ({
  props = defaultDefinedBinding,
  queryClient = createQueryClientMock(),
  queries,
}: RenderDefinedBinding) => {
  return {
    ...renderWithProviders(<DefinedBinding {...props} />, {
      queries: { ...queries },
      queryClient,
    }),
  };
};

describe('DefinedBinding', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading spinner', async () => {
    renderDefinedBinding({});
    const loadingSpinnerTitle = textMock('ux_editor.modal_properties_loading');

    const loadingSpinner = screen.getByTitle(loadingSpinnerTitle);
    expect(loadingSpinner).toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.queryByTitle(loadingSpinnerTitle));
  });

  it('should render edit button with the binding selected', async () => {
    renderDefinedBinding({});

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
        ...defaultDefinedBinding,
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
});
