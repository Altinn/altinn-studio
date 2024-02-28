import React from 'react';
import { Properties } from './Properties';
import { act, screen, waitFor } from '@testing-library/react';
import { mockUseTranslation } from '../../../../../testing/mocks/i18nMock';
import { FormItemContext } from '../../containers/FormItemContext';
import userEvent from '@testing-library/user-event';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { component1Mock, component1IdMock } from '../../testing/layoutMock';
import { renderWithProviders } from '../../testing/mocks';

// Test data:
const textText = 'Tekst';
const dataModelBindingsText = 'Datamodellknytninger';
const contentText = 'Innhold';
const dynamicsText = 'Dynamikk';
const calculationsText = 'Beregninger';
const texts = {
  'right_menu.text': textText,
  'right_menu.dataModelBindings': dataModelBindingsText,
  'right_menu.content': contentText,
  'right_menu.dynamics': dynamicsText,
  'right_menu.calculations': calculationsText,
};

const textTestId = 'text';
const DataModelBindingsTestId = 'dataModelBindings';
const editFormComponentTestId = 'content';
const conditionalRenderingTestId = 'conditionalRendering';
const expressionsTestId = 'expressions';
const calculationsTestId = 'calculations';

// Mocks:
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
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('Properties', () => {
  describe('Text', () => {
    it('Toggles text when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: textText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Opens text when a component is selected', async () => {
      const { rerender } = renderProperties();
      rerender(getComponent({ formItemId: 'test' }));
      const button = screen.queryByRole('button', { name: textText });
      await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'));
    });
  });
  describe('DataModelBindings', () => {
    it('Toggles dataModelBindings when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: dataModelBindingsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });
  describe('Default config', () => {
    it('hides the properties header when the form is undefined', () => {
      renderProperties({ formItem: undefined });

      const heading = screen.queryByRole('heading', { level: 2 });
      expect(heading).not.toBeInTheDocument();
    });

    it('saves the component when changes are made in the properties header', async () => {
      const user = userEvent.setup();
      renderProperties({ formItem: component1Mock, formItemId: component1IdMock });

      const heading = screen.getByRole('heading', {
        name: `ux_editor.component_title.${component1Mock.type}`,
        level: 2,
      });
      expect(heading).toBeInTheDocument();

      const textbox = screen.getByRole('textbox', {
        name: 'ux_editor.modal_properties_component_change_id',
      });

      await act(() => user.type(textbox, '2'));
      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(1);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content', () => {
    it('Closes content on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: contentText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles content when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: contentText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dynamics', () => {
    it('Closes dynamics on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: dynamicsText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles dynamics when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: dynamicsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Shows new dynamics by default', async () => {
      const user = userEvent.setup();
      const { rerender } = renderProperties();
      rerender(getComponent({ formItemId: 'test' }));
      const dynamicsButton = screen.queryByRole('button', { name: dynamicsText });
      await act(() => user.click(dynamicsButton));
      const newDynamics = screen.getByTestId(expressionsTestId);
      expect(newDynamics).toBeInTheDocument();
    });
  });

  describe('Calculations', () => {
    it('Closes calculations on load', () => {
      renderProperties();
      const button = screen.queryByRole('button', { name: calculationsText });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('Toggles calculations when clicked', async () => {
      const user = userEvent.setup();
      renderProperties();
      const button = screen.queryByRole('button', { name: calculationsText });
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'true');
      await act(() => user.click(button));
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('Renders accordion', () => {
    const formIdMock = 'test-id';
    renderProperties({ formItemId: formIdMock });
    expect(screen.getByText(textText)).toBeInTheDocument();
    expect(screen.getByText(dataModelBindingsText)).toBeInTheDocument();
    expect(screen.getByText(contentText)).toBeInTheDocument();
    expect(screen.getByText(dynamicsText)).toBeInTheDocument();
    expect(screen.getByText(calculationsText)).toBeInTheDocument();
    expect(screen.getByTestId(textTestId)).toBeInTheDocument();
    expect(screen.getByTestId(DataModelBindingsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(editFormComponentTestId)).toBeInTheDocument();
    expect(screen.getByTestId(expressionsTestId)).toBeInTheDocument();
    expect(screen.getByTestId(calculationsTestId)).toBeInTheDocument();
  });
});

const getComponent = (formItemContextProps: Partial<FormItemContext> = {}) => (
  <FormItemContext.Provider
    value={{
      ...formItemContextProviderMock,
      ...formItemContextProps,
    }}
  >
    <Properties />
  </FormItemContext.Provider>
);

const renderProperties = (formItemContextProps: Partial<FormItemContext> = {}) =>
  renderWithProviders(getComponent(formItemContextProps));
