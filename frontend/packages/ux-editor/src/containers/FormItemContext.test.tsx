import React, { act } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { FormItemContext, FormItemContextProvider } from './FormItemContext';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../testing/mocks';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormContainer } from '../types/FormContainer';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { appContextMock } from '../testing/appContextMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  component1IdMock,
  component1Mock,
  container1IdMock,
  externalLayoutsMock,
  layout1NameMock,
  layoutMock,
  layoutSetsMock,
} from '../testing/layoutMock';

const org = 'org';
const app = 'app';
const layoutName = layout1NameMock;
const layoutSetName = layoutSetsMock.sets[0].id;

jest.useFakeTimers({ advanceTimers: true });

const render = (ChildComponent: React.ElementType, queries: Partial<ServicesContextProps> = {}) => {
  return renderWithProviders(
    <FormItemContextProvider>
      <ChildComponent />
    </FormItemContextProvider>,
    {
      queryClient: createQueryClientMock(),
      queries: {
        getFormLayouts: jest.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock)),
      },
    },
  );
};

describe('FormItemContext', () => {
  afterEach(jest.clearAllMocks);

  it('should update the form item when calling handleUpdate', async () => {
    const user = userEvent.setup();

    render(() => {
      const { formItem, handleUpdate } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleUpdate(component1Mock)} />
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.id')).textContent).toEqual(component1Mock.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.itemType')).textContent).toEqual(
        component1Mock.itemType,
      ),
    );
  });

  it('should edit the form item when calling handleEdit', async () => {
    const user = userEvent.setup();

    render(() => {
      const { formItemId, formItem, handleEdit } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleEdit(component1Mock)} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toEqual(component1Mock.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.id')).textContent).toEqual(component1Mock.id),
    );
    await waitFor(async () =>
      expect((await screen.findByTestId('formItem.itemType')).textContent).toEqual(
        component1Mock.itemType,
      ),
    );
  });

  it('should render id and itemType when calling handleEdit with truthy updatedForm', async () => {
    const user = userEvent.setup();
    render(() => {
      const { formItemId, formItem, handleEdit } = React.useContext(FormItemContext);
      return (
        <>
          <button data-testid='button' onClick={() => handleEdit(component1Mock)} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    expect(screen.getByTestId('formItemId')).toBeInTheDocument();
    expect(screen.getByTestId('formItem.id')).toBeInTheDocument();
    expect(screen.getByTestId('formItem.itemType')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('formItemId')).toHaveTextContent(component1Mock.id);
    });
    await waitFor(() => {
      expect(screen.getByTestId('formItem.id')).toHaveTextContent(component1Mock.id);
    });
    await waitFor(() => {
      expect(screen.getByTestId('formItem.itemType')).toHaveTextContent(component1Mock.itemType);
    });
  });

  it('should discard the form item when calling handleDiscard', async () => {
    const user = userEvent.setup();
    render(() => {
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

    render(() => {
      const { handleSave } = React.useContext(FormItemContext);
      return (
        <button
          data-testid='button'
          onClick={() => handleSave(container1IdMock, layoutMock.containers[container1IdMock])}
        />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith(layoutSetName, false);
  });

  it('should save the container and its new id when calling handleSave', async () => {
    const user = userEvent.setup();
    const newId = 'new-id';

    render(() => {
      const { formItemId, handleSave } = React.useContext(FormItemContext);
      return (
        <>
          <button
            data-testid='button'
            onClick={async () =>
              await handleSave(container1IdMock, {
                ...layoutMock.containers[container1IdMock],
                id: newId,
              })
            }
          />
          <div data-testid='formItemId'>{formItemId}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toEqual(newId),
    );

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith(layoutSetName, true);
  });

  it('should save the container when calling debounceSave', async () => {
    const user = userEvent.setup();

    render(() => {
      const { debounceSave } = React.useContext(FormItemContext);
      return (
        <button
          data-testid='button'
          onClick={() => debounceSave(container1IdMock, layoutMock.containers[container1IdMock])}
        />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await act(async () => jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS));

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith(layoutSetName, false);
  });

  it('should save the component when calling handleSave', async () => {
    const user = userEvent.setup();

    render(() => {
      const { handleSave } = React.useContext(FormItemContext);
      return (
        <button data-testid='button' onClick={() => handleSave(component1IdMock, component1Mock)} />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith(layoutSetName, false);
  });

  it('should save the component and its new id when calling handleSave', async () => {
    const user = userEvent.setup();
    const newId = 'new-id';

    render(() => {
      const { formItemId, handleSave } = React.useContext(FormItemContext);
      return (
        <>
          <button
            data-testid='button'
            onClick={async () =>
              await handleSave(component1IdMock, {
                ...component1Mock,
                id: newId,
              })
            }
          />
          <div data-testid='formItemId'>{formItemId}</div>
        </>
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await waitFor(async () =>
      expect((await screen.findByTestId('formItemId')).textContent).toEqual(newId),
    );

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith(layoutSetName, true);
  });

  it('should save the component when calling debounceSave', async () => {
    const user = userEvent.setup();

    render(() => {
      const { debounceSave } = React.useContext(FormItemContext);
      return (
        <button
          data-testid='button'
          onClick={() => debounceSave(component1IdMock, component1Mock)}
        />
      );
    });

    const button = screen.getByTestId('button');
    await user.click(button);

    await act(async () => jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS));

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith(layoutSetName, false);
  });
});
