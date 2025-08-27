import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { FormItemContext, FormItemContextProvider } from './FormItemContext';
import userEvent from '@testing-library/user-event';
import type { UpdateFormContainerMutationArgs } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import type { UpdateFormComponentMutationArgs } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import type { UseMutationResult } from '@tanstack/react-query';
import { renderWithMockStore } from '../testing/mocks';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';
import type { IAppState } from '../types/global';

jest.useFakeTimers({ advanceTimers: true });

jest.mock('../hooks/mutations/useUpdateFormContainerMutation');
const mockUpdateFormContainer = jest.fn();
const mockUseUpdateFormContainerMutation = useUpdateFormContainerMutation as jest.MockedFunction<
  typeof useUpdateFormContainerMutation
>;
mockUseUpdateFormContainerMutation.mockReturnValue({
  mutateAsync: mockUpdateFormContainer,
} as unknown as UseMutationResult<
  { currentId: string; newId: string },
  Error,
  UpdateFormContainerMutationArgs,
  unknown
>);

jest.mock('../hooks/mutations/useUpdateFormComponentMutation');
const mockUpdateFormComponent = jest.fn();
const mockUseUpdateFormComponentMutation = useUpdateFormComponentMutation as jest.MockedFunction<
  typeof useUpdateFormComponentMutation
>;
mockUseUpdateFormComponentMutation.mockReturnValue({
  mutateAsync: mockUpdateFormComponent,
} as unknown as UseMutationResult<
  { currentId: string; newId: string },
  Error,
  UpdateFormComponentMutationArgs,
  unknown
>);

const render = (ChildComponent: React.ElementType) => {
  return renderWithMockStore()(
    <FormItemContextProvider>
      <ChildComponent />
    </FormItemContextProvider>,
  );
};

describe('FormItemContext', () => {
  afterEach(jest.clearAllMocks);

  it('should update the form item when calling handleUpdate', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormContainer = {
      id: 'id',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
    };

    render(() => {
      const { formItem, handleUpdate } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleUpdate(mockFormItem)} />
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.id')).textContent).toEqual(mockFormItem.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.itemType')).textContent).toEqual(
        mockFormItem.itemType,
      ),
    );
  });

  it('should edit the form item when calling handleEdit', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormContainer = {
      id: 'id',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
    };

    const { store } = render(() => {
      const { formItemId, formItem, handleEdit } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleEdit(mockFormItem)} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    const state = store.getState() as IAppState;
    expect(state?.appData?.textResources?.currentEditId).toBeUndefined();
    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toEqual(mockFormItem.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.id')).textContent).toEqual(mockFormItem.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.itemType')).textContent).toEqual(
        mockFormItem.itemType,
      ),
    );
  });

  it('should render id and itemType when calling handleEdit with truthy updatedForm', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormContainer = {
      id: 'id',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
    };
    const { store } = render(() => {
      const { formItemId, formItem, handleEdit } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleEdit(mockFormItem)} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);
    const state = store.getState() as IAppState;

    expect(state?.appData?.textResources?.currentEditId).toBeUndefined();
    expect(screen.getByTestId('formItemId')).toBeInTheDocument();
    expect(screen.getByTestId('formItem.id')).toBeInTheDocument();
    expect(screen.getByTestId('formItem.itemType')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('formItemId')).toHaveTextContent(mockFormItem.id);
    });
    await waitFor(() => {
      expect(screen.getByTestId('formItem.id')).toHaveTextContent(mockFormItem.id);
    });
    await waitFor(() => {
      expect(screen.getByTestId('formItem.itemType')).toHaveTextContent(mockFormItem.itemType);
    });
  });

  it('should discard the formitem when calling handleDiscard', async () => {
    const user = userEvent.setup();
    const { store } = render(() => {
      const { formItemId, formItem, handleDiscard } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleDiscard()} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    const state = store.getState() as IAppState;
    expect(state?.appData?.textResources?.currentEditId).toBeUndefined();
    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toBe(''),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.id')).textContent).toBe(''),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.itemType')).textContent).toBe(''),
    );
  });

  it('should save the container when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormContainer = {
      id: 'id',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
    };

    render(() => {
      const { handleSave } = React.useContext(FormItemContext);
      return (
        <button data-testid='button' onClick={() => handleSave(mockFormItem.id, mockFormItem)} />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the container and its new id when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormContainer = {
      id: 'id',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
    };

    render(() => {
      const { formItemId, handleSave } = React.useContext(FormItemContext);
      return (
        <>
          <button
            data-testid='button'
            onClick={async () => await handleSave('old-id', mockFormItem)}
          />
          <div data-testid='formItemId'>{formItemId}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toEqual(mockFormItem.id),
    );
    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the container when calling debounceSave', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormContainer = {
      id: 'id',
      itemType: 'CONTAINER',
      type: ComponentTypeV3.Group,
    };

    render(() => {
      const { debounceSave } = React.useContext(FormItemContext);
      return (
        <button data-testid='button' onClick={() => debounceSave(mockFormItem.id, mockFormItem)} />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);

    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the component when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormComponent = {
      id: 'id',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Input,
    };

    render(() => {
      const { handleSave } = React.useContext(FormItemContext);
      return (
        <button data-testid='button' onClick={() => handleSave(mockFormItem.id, mockFormItem)} />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });

  it('should save the component and its new id when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormComponent = {
      id: 'id',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Input,
    };

    render(() => {
      const { formItemId, handleSave } = React.useContext(FormItemContext);
      return (
        <>
          <button
            data-testid='button'
            onClick={async () => await handleSave('old-id', mockFormItem)}
          />
          <div data-testid='formItemId'>{formItemId}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toEqual(mockFormItem.id),
    );
    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });

  it('should save the component when calling debounceSave', async () => {
    const user = userEvent.setup();
    const mockFormItem: FormComponent = {
      id: 'id',
      itemType: 'COMPONENT',
      type: ComponentTypeV3.Input,
    };

    render(() => {
      const { debounceSave } = React.useContext(FormItemContext);
      return (
        <button data-testid='button' onClick={() => debounceSave(mockFormItem.id, mockFormItem)} />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);

    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });
});
