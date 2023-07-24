import React from 'react';
import { screen } from '@testing-library/react';
import { FormContextProvider, FormContext } from './FormContext';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { UpdateFormContainerMutationArgs, useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { UpdateFormComponentMutationArgs, useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { UseMutationResult } from '@tanstack/react-query';
import { renderWithMockStore } from '../testing/mocks';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';

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

const ChildComponent = () => {
  const { handleContainerSave, handleComponentSave } = React.useContext(FormContext);

  return (
    <div>
      <button onClick={() => handleContainerSave('test', { id: 'test', itemType: 'CONTAINER' })}>Container Save</button>
      <button onClick={() => handleComponentSave('test', { id: 'test', itemType: 'COMPONENT', type: ComponentType.Input })}>Component Save</button>
    </div>
  );
};

const render = () => {
  return renderWithMockStore()(
    <FormContextProvider>
      <ChildComponent />
    </FormContextProvider>
  );
}

describe('FormContext', () => {
  it('should save the container when calling save', async () => {
    render();

    const button = screen.getByText('Container Save');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(mockUpdateFormContainer).toHaveBeenCalledTimes(1);
  });

  it('should save the component when calling save', async () => {
    render();

    const button = screen.getByText('Component Save');
    await act(() => user.click(button));

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL);

    expect(mockUpdateFormComponent).toHaveBeenCalledTimes(1);
  });
});
