import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { ButtonComponent } from './ButtonComponent';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { FormButtonComponent } from '../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../componentConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';

// Test data:
const component: FormButtonComponent = {
  id: '1',
  onClickAction: jest.fn(),
  type: ComponentTypeV3.Button,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const handleComponentChange = jest.fn();
const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

describe('ButtonComponent', () => {
  it('should render title text resource bindings for Button component', async () => {
    await render();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_textResourceBindings_title')),
    ).toBeInTheDocument();
  });

  it('should render next and back text resource bindings for NavigationButtons component', async () => {
    await render({
      component: {
        ...component,
        type: ComponentTypeV3.NavigationButtons,
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_textResourceBindings_next')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_textResourceBindings_back')),
    ).toBeInTheDocument();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props?: Partial<IGenericEditComponent>) => {
  await waitForData();

  renderWithMockStore()(<ButtonComponent {...defaultProps} {...props} />);
};
