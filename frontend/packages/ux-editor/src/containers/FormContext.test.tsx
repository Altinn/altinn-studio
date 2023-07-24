import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { FormContextProvider, FormContext } from './FormContext';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { UpdateFormContainerMutationArgs, useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { UpdateFormComponentMutationArgs, useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { UseMutationResult } from '@tanstack/react-query';
import { renderWithMockStore } from '../testing/mocks';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormContainer } from '../types/FormContainer';
import type { FormComponent } from '../types/FormComponent';

jest.useFakeTimers({ advanceTimers: true });

jest.mock('../hooks/mutations/useUpdateFormContainerMutation');
const mockUpdateFormContainer = jest.fn();
const mockUseUpdateFormContainerMutation = useUpdateFormContainerMutation as jest.MockedFunction<typeof useUpdateFormContainerMutation>;
mockUseUpdateFormContainerMutation.mockReturnValue({
  mutateAsync: mockUpdateFormContainer,
} as unknown as UseMutationResult<{ currentId: string; newId: string; }, unknown, UpdateFormContainerMutationArgs, unknown>);

jest.mock('../hooks/mutations/useUpdateFormComponentMutation');
const mockUpdateFormComponent = jest.fn();
const mockUseUpdateFormComponentMutation = useUpdateFormComponentMutation as jest.MockedFunction<typeof useUpdateFormComponentMutation>;
mockUseUpdateFormComponentMutation.mockReturnValue({
  mutateAsync: mockUpdateFormComponent,
} as unknown as UseMutationResult<{ currentId: string; newId: string; }, unknown, UpdateFormComponentMutationArgs, unknown>);

const user = userEvent.setup();

const render = (ChildComponent: React.ElementType) => {
  return renderWithMockStore()(
    <FormContextProvider>
      <ChildComponent />
    </FormContextProvider>
  );
};

describe('FormContext', () => {
  afterEach(jest.clearAllMocks);

  it('should save the container when calling save', async () => {
    const form: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    render(() => {
      const { handleContainerSave } = React.useContext(FormContext);
      return (<button data-testid="button" onClick={() => handleContainerSave(form.id, form)}>Container Save</button>);
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the container and its new id when calling save', async () => {
    const form: FormContainer = { id: 'id', itemType: 'CONTAINER' };

    render(() => {
      const { formId, handleContainerSave } = React.useContext(FormContext);
      return (<>
        <button data-testid="button" onClick={() => handleContainerSave('old-id', form)} />
        <div data-testid="formId">{formId}</div>
      </>);
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    await waitFor(async () => expect((await screen.findByTestId('formId')).textContent).toEqual(form.id));
    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the component when calling save', async () => {
    const form: FormComponent = { id: 'id', itemType: 'COMPONENT', type: ComponentType.Input };

    render(() => {
      const { handleComponentSave } = React.useContext(FormContext);
      return (<button data-testid="button" onClick={() => handleComponentSave(form.id, form)} />);
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });

  it('should save the component and its new id when calling save', async () => {
    const form: FormComponent = { id: 'id', itemType: 'COMPONENT', type: ComponentType.Input };

    render(() => {
      const { formId, handleComponentSave } = React.useContext(FormContext);
      return (<>
        <button data-testid="button" onClick={() => handleComponentSave('old-id', form)} />
        <div data-testid="formId">{formId}</div>
      </>);
    });

    const button = screen.getByTestId('button');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    await waitFor(async () => expect((await screen.findByTestId('formId')).textContent).toEqual(form.id));
    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });
});
