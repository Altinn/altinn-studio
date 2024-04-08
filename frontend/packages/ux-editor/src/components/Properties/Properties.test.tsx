import React from 'react';
import { Properties } from './Properties';
import { act, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { FormItemContext } from '../../containers/FormItemContext';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { renderWithProviders } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const pageConfigPanelTestId = 'pageConfigPanel';
const textTestId = 'text';
const DataModelBindingsTestId = 'dataModelBindings';
const editFormComponentTestId = 'content';
const conditionalRenderingTestId = 'conditionalRendering';
const expressionsTestId = 'expressions';
const calculationsTestId = 'calculations';

// Mocks:
jest.mock('./PageConfigPanel', () => ({
  PageConfigPanel: () => <div data-testid={pageConfigPanelTestId} />,
}));
jest.mock('./Text', () => ({
  Text: () => <div data-testid={textTestId} />,
}));
jest.mock('./DataModelBindings', () => ({
  DataModelBindings: () => <div data-testid={DataModelBindingsTestId} />,
}));
jest.mock('../config/EditFormComponent', () => ({
  EditFormComponent: () => <div data-testid={editFormComponentTestId} />,
}));
jest.mock('./ConditionalRendering', () => ({
  ConditionalRendering: () => <div data-testid={conditionalRenderingTestId} />,
}));
jest.mock('../config/Expressions', () => ({
  Expressions: () => <div data-testid={expressionsTestId} />,
}));
jest.mock('./Calculations', () => ({
  Calculations: () => <div data-testid={calculationsTestId} />,
}));

describe('Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text', () => {
    it('Toggles text when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.text') });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });
  describe('DataModelBindings', () => {
    it('Toggles dataModelBindings when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', {
        name: textMock('right_menu.dataModelBindings'),
      });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });
  describe('Page config', () => {
    it('shows page config when formItem is undefined', () => {
      renderProperties({ formItem: undefined });
      const pageConfigPanel = screen.getByTestId(pageConfigPanelTestId);
      expect(pageConfigPanel).toBeInTheDocument();
    });
  });
  describe('Component ID Config', () => {
    it('saves the component when changes are made in the properties header', async () => {
      const user = userEvent.setup();
      renderProperties();
      const heading = screen.getByRole('heading', {
        name: textMock('ux_editor.component_title.Input'),
        level: 2,
      });
      expect(heading).toBeInTheDocument();
      const editComponentIdButton = screen.getByRole('button', {
        name: textMock('ux_editor.id_identifier'),
      });
      expect(editComponentIdButton).toBeInTheDocument();
      await act(() => user.click(editComponentIdButton));
      const textbox = screen.getByRole('textbox', {
        name: textMock('ux_editor.modal_properties_component_change_id'),
      });
      const validId = 'valid-id';
      await act(() => user.type(textbox, validId));
      await act(() => user.click(document.body));
      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
    });

    it('should not invoke handleUpdate when the id is invalid', async () => {
      const user = userEvent.setup();
      renderProperties();
      await act(() =>
        user.click(screen.getByRole('button', { name: textMock('ux_editor.id_identifier') })),
      );
      const invalidId = 'invalidId-01';
      await act(() =>
        user.type(
          screen.getByLabelText(textMock('ux_editor.modal_properties_component_change_id')),
          invalidId,
        ),
      );
      expect(formItemContextProviderMock.handleUpdate).not.toHaveBeenCalled();
    });

    it('has all accordion items closed by default', async () => {
      const { rerender } = renderProperties();
      rerender(getComponent());
      const textAccordion = screen.getByRole('button', { name: textMock('right_menu.text') });
      expect(textAccordion).toHaveAttribute('aria-expanded', 'false');
      const dataModelBindingsAccordion = screen.getByRole('button', {
        name: textMock('right_menu.dataModelBindings'),
      });
      expect(dataModelBindingsAccordion).toHaveAttribute('aria-expanded', 'false');
      const contentAccordion = screen.getByRole('button', { name: textMock('right_menu.content') });
      expect(contentAccordion).toHaveAttribute('aria-expanded', 'false');
      const dynamicsAccordion = screen.getByRole('button', {
        name: textMock('right_menu.dynamics'),
      });
      expect(dynamicsAccordion).toHaveAttribute('aria-expanded', 'false');
      const calculationsAccordion = screen.getByRole('button', {
        name: textMock('right_menu.calculations'),
      });
      expect(calculationsAccordion).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Content', () => {
    it('Closes content on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles content when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.content') });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.dynamics') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles dynamics when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.dynamics') });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shows new dynamics by default', async () => {
      renderProperties();
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.calculations') });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles calculations when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textMock('right_menu.calculations') });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('Renders properties accordions when formItem is selected', () => {
    renderProperties();
    expect(screen.getByText(textMock('right_menu.text'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.dataModelBindings'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.content'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.dynamics'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.calculations'))).toBeInTheDocument();
    expect(screen.getByTestId(textTestId)).toBeInTheDocument();
    expect(screen.getByTestId(DataModelBindingsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(editFormComponentTestId)).toBeInTheDocument();
    expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTestId)).toBeInTheDocument();
  });
});

const getComponent = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
) => (
  <FormItemContext.Provider
    value={{
      ...formItemContextProviderMock,
      ...formItemContextProps,
    }}
  >
    <Properties />
  </FormItemContext.Provider>
);

const renderProperties = (
  formItemContextProps: Partial<FormItemContext> = {
    formItem: componentMocks[ComponentType.Input],
    formItemId: componentMocks[ComponentType.Input].id,
  },
) => renderWithProviders(getComponent(formItemContextProps));
