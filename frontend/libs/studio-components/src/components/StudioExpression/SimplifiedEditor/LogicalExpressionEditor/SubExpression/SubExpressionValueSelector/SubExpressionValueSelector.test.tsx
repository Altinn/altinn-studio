import { act, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { StudioExpressionContext } from '../../../../StudioExpressionContext';
import type { SubExpressionValueSelectorProps } from './SubExpressionValueSelector';
import { SubExpressionValueSelector } from './SubExpressionValueSelector';
import React from 'react';
import { SimpleSubExpressionValueType } from '../../../../enums/SimpleSubExpressionValueType';
import type { SimpleSubExpressionValue } from '../../../../types/SimpleSubExpressionValue';
import {
  componentIds,
  dataLookupOptions,
  datamodelPointers,
} from '../../../../test-data/dataLookupOptions';
import { texts } from '../../../../test-data/texts';
import userEvent from '@testing-library/user-event';
import { InstanceContext } from '../../../../enums/InstanceContext';
import { ExpressionErrorKey } from '../../../../enums/ExpressionErrorKey';

describe('SubExpressionValueSelector', () => {
  it('Renders with the given legend in edit mode', () => {
    const legend = 'test-legend';
    renderSubExpressionValueSelector({ legend, isInEditMode: true });
    expect(screen.getByRole('group', { name: legend })).toBeInTheDocument();
  });

  it('Calls the onChange function with a new value when the value type is changed', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    renderSubExpressionValueSelector({ onChange, isInEditMode: true });
    const select = screen.getByRole('combobox');
    const newValueType = SimpleSubExpressionValueType.Number;
    await act(() => user.selectOptions(select, newValueType));
    expect(onChange).toHaveBeenCalledWith({ type: newValueType, value: 0 });
  });

  describe('When the value is a string', () => {
    it('Displays the value in readonly mode', () => {
      renderSubExpressionValueSelector({ value: stringValue, isInEditMode: false });
      screen.getByText('"' + stringValue.value + '"');
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: stringValue, isInEditMode: true, onChange });
      const input = screen.getByRole('textbox');
      const addedText = 'A';
      await act(() => user.type(input, addedText));
      expect(onChange).toHaveBeenLastCalledWith({
        ...stringValue,
        value: stringValue.value + addedText,
      });
    });
  });

  describe('When the value is a number', () => {
    const numberValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.Number> = {
      type: SimpleSubExpressionValueType.Number,
      value: 42,
    };

    it('Displays the value in readonly mode', () => {
      renderSubExpressionValueSelector({ value: numberValue, isInEditMode: false });
      screen.getByText(numberValue.value.toString());
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: numberValue, isInEditMode: true, onChange });
      const input = screen.getByRole('textbox');
      const addedValue = 1;
      await act(() => user.type(input, addedValue.toString()));
      expect(onChange).toHaveBeenLastCalledWith({ ...numberValue, value: 421 });
    });
  });

  describe.each([true, false])('When the value is %s', (value) => {
    const booleanValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.Boolean> = {
      type: SimpleSubExpressionValueType.Boolean,
      value,
    };
    const booleanText = (b: boolean) => (b ? texts.true : texts.false);

    it('Displays the value in readonly mode', () => {
      renderSubExpressionValueSelector({ value: booleanValue, isInEditMode: false });
      screen.getByText(value ? texts.true : texts.false);
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: booleanValue, isInEditMode: true, onChange });
      const newValue = !value;
      await act(() => user.click(screen.getByRole('radio', { name: booleanText(newValue) })));
      expect(onChange).toHaveBeenLastCalledWith({ ...booleanValue, value: newValue });
    });
  });

  describe('When the value is a datamodel field reference', () => {
    const datamodelValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.Datamodel> = {
      type: SimpleSubExpressionValueType.Datamodel,
      path: datamodelPointers[0],
    };

    it('Displays the path in readonly mode', () => {
      renderSubExpressionValueSelector({ value: datamodelValue, isInEditMode: false });
      screen.getByText(datamodelValue.path);
    });

    it('Renders with the given datamodel path value in edit mode', () => {
      renderSubExpressionValueSelector({ value: datamodelValue, isInEditMode: true });
      const select = screen.getByRole('combobox', { name: texts.datamodelPath });
      expect(select).toHaveValue(datamodelValue.path);
    });

    it('Renders with an empty combobox in edit mode when the datamodel path is an empty string', () => {
      renderSubExpressionValueSelector({
        value: { ...datamodelValue, path: '' },
        isInEditMode: true,
      });
      const select = screen.getByRole('combobox', { name: texts.datamodelPath });
      expect(select).toHaveValue('');
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: datamodelValue, isInEditMode: true, onChange });
      const newPointer = datamodelPointers[1];
      await act(() => user.click(screen.getByRole('combobox', { name: texts.datamodelPath })));
      await act(() => user.click(screen.getByRole('option', { name: newPointer })));
      await waitForElementToBeRemoved(screen.getByRole('listbox')); // Needs to wait here because the Combobox component's change function is asynchronous
      expect(onChange).toHaveBeenCalledWith({ ...datamodelValue, path: newPointer });
    });

    it('Displays an error and does not call the onChange function when the user enters an invalid value', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: datamodelValue, isInEditMode: true, onChange });
      const input = () => screen.getByRole('combobox', { name: texts.datamodelPath });
      await act(() => user.type(input(), '{backspace}'));
      await act(() => user.click(document.body));
      screen.getByText(texts.errorMessages[ExpressionErrorKey.InvalidDatamodelPath]);
    });
  });

  describe('When the value is a component reference', () => {
    const componentValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.Component> = {
      type: SimpleSubExpressionValueType.Component,
      id: componentIds[0],
    };

    it('Displays the componentId in readonly mode', () => {
      renderSubExpressionValueSelector({ value: componentValue, isInEditMode: false });
      screen.getByText(componentValue.id);
    });

    it('Renders with the given component id value in edit mode', () => {
      renderSubExpressionValueSelector({ value: componentValue, isInEditMode: true });
      const select = screen.getByRole('combobox', { name: texts.componentId });
      expect(select).toHaveValue(componentValue.id);
    });

    it('Renders with an empty combobox in edit mode when the component id is an empty string', () => {
      renderSubExpressionValueSelector({
        value: { ...componentValue, id: '' },
        isInEditMode: true,
      });
      const select = screen.getByRole('combobox', { name: texts.componentId });
      expect(select).toHaveValue('');
    });

    it('Lets the user edit the value in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: componentValue, isInEditMode: true, onChange });
      const newId = componentIds[1];
      await act(() => user.click(screen.getByRole('combobox', { name: texts.componentId })));
      await act(() => user.click(screen.getByRole('option', { name: newId })));
      await waitForElementToBeRemoved(screen.getByRole('listbox')); // Needs to wait here because the Combobox component's change function is asynchronous
      expect(onChange).toHaveBeenCalledWith({ ...componentValue, id: newId });
    });

    it('Displays an error and does not call the onChange function when the user enters an invalid value', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({ value: componentValue, isInEditMode: true, onChange });
      const input = () => screen.getByRole('combobox', { name: texts.componentId });
      await act(() => user.type(input(), '{backspace}'));
      await act(() => user.click(document.body));
      screen.getByText(texts.errorMessages[ExpressionErrorKey.InvalidComponentId]);
    });
  });

  describe('When the value is an instance context reference', () => {
    it.each(Object.values(InstanceContext))(
      'Displays the key in readonly mode when it is %s',
      (key) => {
        const instanceContextValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.InstanceContext> =
          {
            type: SimpleSubExpressionValueType.InstanceContext,
            key,
          };
        renderSubExpressionValueSelector({ value: instanceContextValue, isInEditMode: false });
        screen.getByText(texts.instanceContext[key]);
      },
    );

    it('Lets the user edit the value in edit mode', async () => {
      const instanceContextValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.InstanceContext> =
        {
          type: SimpleSubExpressionValueType.InstanceContext,
          key: InstanceContext.AppId,
        };
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderSubExpressionValueSelector({
        value: instanceContextValue,
        isInEditMode: true,
        onChange,
      });
      const newKey = InstanceContext.AppId;
      const select = screen.getByRole('combobox', { name: texts.instanceContextKey });
      await act(() => user.selectOptions(select, newKey));
      expect(onChange).toHaveBeenCalledWith({ ...instanceContextValue, key: newKey });
    });
  });

  describe('When the value is null', () => {
    it('Displays "null" code in readonly mode', () => {
      const nullValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.Null> = {
        type: SimpleSubExpressionValueType.Null,
      };
      renderSubExpressionValueSelector({ value: nullValue, isInEditMode: false });
      screen.getByText('null');
    });
  });
});

const stringValue: SimpleSubExpressionValue<SimpleSubExpressionValueType.String> = {
  type: SimpleSubExpressionValueType.String,
  value: 'value',
};

const defaultProps: SubExpressionValueSelectorProps = {
  value: stringValue,
  onChange: jest.fn(),
  isInEditMode: false,
  legend: 'legend',
};

const renderSubExpressionValueSelector = (props: Partial<SubExpressionValueSelectorProps> = {}) =>
  render(
    <StudioExpressionContext.Provider value={{ texts, dataLookupOptions }}>
      <SubExpressionValueSelector {...defaultProps} {...props} />
    </StudioExpressionContext.Provider>,
  );
