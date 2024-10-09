import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { FormItemContext, FormItemContextProvider } from './FormItemContext';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../testing/mocks';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { appContextMock } from '../testing/appContextMock';
import {
  component1IdMock,
  component1Mock,
  container1IdMock,
  externalLayoutsMock,
  layout1NameMock,
  layoutMock,
} from '../testing/layoutMock';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';

const layoutName = layout1NameMock;
const layoutSetName = layoutSet1NameMock;

jest.useFakeTimers({ advanceTimers: true });

const buttonTestId = 'button';
const Button = ({ onClick }: { onClick: () => void }) => (
  <button data-testid={buttonTestId} onClick={onClick} />
);
const clickButton = async () => {
  const user = userEvent.setup();
  const button = screen.getByTestId(buttonTestId);
  await user.click(button);
};

const render = (ChildComponent: React.ElementType) => {
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
    render(() => {
      const { formItem, handleUpdate } = React.useContext(FormItemContext);
      return (
        <>
          <Button onClick={() => handleUpdate(component1Mock)} />
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    await clickButton();

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
    render(() => {
      const { formItemId, formItem, handleEdit } = React.useContext(FormItemContext);
      return (
        <>
          <Button onClick={() => handleEdit(component1Mock)} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    await clickButton();

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

  it('should discard the form item when calling handleDiscard', async () => {
    render(() => {
      const { formItemId, formItem, handleDiscard } = React.useContext(FormItemContext);
      return (
        <>
          <Button onClick={() => handleDiscard()} />
          <div data-testid='formItemId'>{formItemId}</div>
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.itemType'>{formItem?.itemType}</div>
        </>
      );
    });

    await clickButton();

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
    render(() => {
      const { handleSave } = React.useContext(FormItemContext);
      return (
        <Button
          onClick={() => handleSave(container1IdMock, layoutMock.containers[container1IdMock])}
        />
      );
    });

    await clickButton();

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith(layoutSetName, false);
  });

  it('should save the container and its new id when calling handleSave', async () => {
    const newId = 'new-id';

    render(() => {
      const { formItemId, handleSave } = React.useContext(FormItemContext);
      return (
        <>
          <Button
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

    await clickButton();

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
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith(layoutSetName, true);
  });

  it('should save the container when calling debounceSave', async () => {
    render(() => {
      const { debounceSave } = React.useContext(FormItemContext);
      return (
        <Button
          onClick={() => debounceSave(container1IdMock, layoutMock.containers[container1IdMock])}
        />
      );
    });

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);

    await clickButton();

    await waitFor(() => expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith(layoutSetName, false);
  });

  it('should save the component when calling handleSave', async () => {
    render(() => {
      const { handleSave } = React.useContext(FormItemContext);
      return <Button onClick={() => handleSave(component1IdMock, component1Mock)} />;
    });

    await clickButton();

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith(layoutSetName, false);
  });

  it('should save the component and its new id when calling handleSave', async () => {
    const newId = 'new-id';

    render(() => {
      const { formItemId, handleSave } = React.useContext(FormItemContext);
      return (
        <>
          <Button
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

    await clickButton();

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
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith(layoutSetName, true);
  });

  it('should save the component when calling debounceSave', async () => {
    render(() => {
      const { debounceSave } = React.useContext(FormItemContext);
      return <Button onClick={() => debounceSave(component1IdMock, component1Mock)} />;
    });

    jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);

    await clickButton();

    await waitFor(() => expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1));
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layoutName,
      layoutSetName,
      expect.any(Object),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith(layoutSetName, false);
  });
});
