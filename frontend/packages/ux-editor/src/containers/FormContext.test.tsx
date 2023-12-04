import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import { FormContextProvider, FormContext } from './FormContext';
import userEvent from '@testing-library/user-event';
import {
  UpdateFormContainerMutationArgs,
  useUpdateFormContainerMutation,
} from '../hooks/mutations/useUpdateFormContainerMutation';
import {
  UpdateFormComponentMutationArgs,
  useUpdateFormComponentMutation,
} from '../hooks/mutations/useUpdateFormComponentMutation';
import { UseMutationResult } from '@tanstack/react-query';
import { renderWithMockStore } from '../testing/mocks';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';
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
    <FormContextProvider>
      <ChildComponent />
    </FormContextProvider>,
  );
};

describe('FormContext', () => {
  afterEach(jest.clearAllMocks);

  it('should update the form when calling handleUpdate', async () => {
    const user = userEvent.setup();
    const mockForm: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    render(() => {
      const { form, handleUpdate } = React.useContext(FormContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleUpdate(mockForm)} />
          <div data-testid='form.id'>{form?.id}</div>
          <div data-testid='form.itemType'>{form?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () =>
      expect((await screen.findByTestId('form.id')).textContent).toEqual(mockForm.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('form.itemType')).textContent).toEqual(mockForm.itemType),
    );
  });

  it('should edit the form when calling handleEdit', async () => {
    const user = userEvent.setup();
    const mockForm: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    const { store } = render(() => {
      const { formId, form, handleEdit } = React.useContext(FormContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleEdit(mockForm)} />
          <div data-testid='formId'>{formId}</div>
          <div data-testid='form.id'>{form?.id}</div>
          <div data-testid='form.itemType'>{form?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    const state = store.getState() as IAppState;
    expect(state?.appData?.textResources?.currentEditId).toBeUndefined();
    await waitFor(async () =>
      expect((await screen.findByTestId('formId')).textContent).toEqual(mockForm.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('form.id')).textContent).toEqual(mockForm.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('form.itemType')).textContent).toEqual(mockForm.itemType),
    );
  });

  it('should render id and itemType when calling handleEdit with truthy updatedForm', async () => {
    const user = userEvent.setup();
    const mockForm: FormContainer = { id: 'id', itemType: 'CONTAINER' };
    const { store } = render(() => {
      const { formId, form, handleEdit } = React.useContext(FormContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleEdit(mockForm)} />
          <div data-testid='formId'>{formId}</div>
          <div data-testid='form.id'>{form?.id}</div>
          <div data-testid='form.itemType'>{form?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));
    const state = store.getState() as IAppState;

    expect(state?.appData?.textResources?.currentEditId).toBeUndefined();
    expect(screen.getByTestId('formId')).toBeInTheDocument();
    expect(screen.getByTestId('form.id')).toBeInTheDocument();
    expect(screen.getByTestId('form.itemType')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('formId')).toHaveTextContent(mockForm.id);
    });
    await waitFor(() => {
      expect(screen.getByTestId('form.id')).toHaveTextContent(mockForm.id);
    });
    await waitFor(() => {
      expect(screen.getByTestId('form.itemType')).toHaveTextContent(mockForm.itemType);
    });
  });

  it('should discard the form when calling handleDiscard', async () => {
    const user = userEvent.setup();
    const { store } = render(() => {
      const { formId, form, handleDiscard } = React.useContext(FormContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleDiscard()} />
          <div data-testid='formId'>{formId}</div>
          <div data-testid='form.id'>{form?.id}</div>
          <div data-testid='form.itemType'>{form?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    const state = store.getState() as IAppState;
    expect(state?.appData?.textResources?.currentEditId).toBeUndefined();
    await waitFor(async () => expect((await screen.findByTestId('formId')).textContent).toBe(''));
    await waitFor(async () => expect((await screen.findByTestId('form.id')).textContent).toBe(''));
    await waitFor(async () =>
      expect((await screen.findByTestId('form.itemType')).textContent).toBe(''),
    );
  });

  it('should save the container when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockForm: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    render(() => {
      const { handleSave } = React.useContext(FormContext);
      return <button data-testid='button' onClick={() => handleSave(mockForm.id, mockForm)} />;
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the container and its new id when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockForm: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    render(() => {
      const { formId, handleSave } = React.useContext(FormContext);
      return (
        <>
          <button data-testid='button' onClick={async () => await handleSave('old-id', mockForm)} />
          <div data-testid='formId'>{formId}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () =>
      expect((await screen.findByTestId('formId')).textContent).toEqual(mockForm.id),
    );
    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the container when calling debounceSave', async () => {
    const user = userEvent.setup();
    const mockForm: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    render(() => {
      const { debounceSave } = React.useContext(FormContext);
      return <button data-testid='button' onClick={() => debounceSave(mockForm.id, mockForm)} />;
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the component when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockForm: FormComponent = { id: 'id', itemType: 'COMPONENT', type: ComponentType.Input };

    render(() => {
      const { handleSave } = React.useContext(FormContext);
      return <button data-testid='button' onClick={() => handleSave(mockForm.id, mockForm)} />;
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });

  it('should save the component and its new id when calling handleSave', async () => {
    const user = userEvent.setup();
    const mockForm: FormComponent = { id: 'id', itemType: 'COMPONENT', type: ComponentType.Input };

    render(() => {
      const { formId, handleSave } = React.useContext(FormContext);
      return (
        <>
          <button data-testid='button' onClick={async () => await handleSave('old-id', mockForm)} />
          <div data-testid='formId'>{formId}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    await waitFor(async () =>
      expect((await screen.findByTestId('formId')).textContent).toEqual(mockForm.id),
    );
    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });

  it('should save the component when calling debounceSave', async () => {
    const user = userEvent.setup();
    const mockForm: FormComponent = { id: 'id', itemType: 'COMPONENT', type: ComponentType.Input };

    render(() => {
      const { debounceSave } = React.useContext(FormContext);
      return <button data-testid='button' onClick={() => debounceSave(mockForm.id, mockForm)} />;
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });
});
