import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { FormItemContext, FormItemContextProvider } from './FormItemContext';
import userEvent from '@testing-library/user-event';
import { formLayoutSettingsMock, renderWithProviders } from '../testing/mocks';
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
  pagesModelMock,
} from '../testing/layoutMock';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { AppContextProvider } from '../AppContext';
import { useAppContext } from '../hooks';
import { ItemType } from '../components/Properties/ItemType';
import { Properties } from '../components/Properties';

const layoutName = layout1NameMock;
const layoutSetName = layoutSet1NameMock;

vi.useFakeTimers({ shouldAdvanceTime: true });

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
        getFormLayouts: vi.fn().mockImplementation(() => Promise.resolve(externalLayoutsMock)),
      },
    },
  );
};

describe('FormItemContext', () => {
  it('should update the form item when calling handleUpdate', async () => {
    render(() => {
      const { formItem, handleUpdate } = React.useContext(FormItemContext);
      return (
        <>
          <Button onClick={() => handleUpdate(component1Mock)} />
          <div data-testid='formItem.id'>{formItem?.id}</div>
          <div data-testid='formItem.type'>{formItem?.type}</div>
        </>
      );
    });

    await clickButton();

    await waitFor(() =>
      expect(screen.getByTestId('formItem.id')).toHaveTextContent(component1Mock.id),
    );
    await waitFor(() =>
      expect(screen.getByTestId('formItem.type')).toHaveTextContent(component1Mock.type),
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
          <div data-testid='formItem.type'>{formItem?.type}</div>
        </>
      );
    });

    await clickButton();

    await waitFor(() =>
      expect(screen.getByTestId('formItemId').textContent).toEqual(component1Mock.id),
    );
    await waitFor(() =>
      expect(screen.getByTestId('formItem.id').textContent).toEqual(component1Mock.id),
    );
    await waitFor(() =>
      expect(screen.getByTestId('formItem.type').textContent).toEqual(component1Mock.type),
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
          <div data-testid='formItem.type'>{formItem?.type}</div>
        </>
      );
    });

    await clickButton();

    await waitFor(() => expect(screen.getByTestId('formItemId').textContent).toBe(''));
    await waitFor(() => expect(screen.getByTestId('formItem.id').textContent).toBe(''));
    await waitFor(() => expect(screen.getByTestId('formItem.type').textContent).toBe(''));
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

    await waitFor(() => expect(screen.getByTestId('formItemId').textContent).toEqual(newId));

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

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);

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

    await waitFor(() => expect(screen.getByTestId('formItemId').textContent).toEqual(newId));

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

    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);

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

describe('FormItemContext restoring a component selected in the URL', () => {
  const formItemIdTestId = 'formItemId';

  const FormItemId = () => {
    const { formItemId } = React.useContext(FormItemContext);
    return <div data-testid={formItemIdTestId}>{formItemId}</div>;
  };

  const renderAtComponentUrl = (componentId: string, ChildComponent: React.ElementType) => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], {
      [layoutName]: layoutMock,
    });
    return renderWithProviders(
      <FormItemContextProvider>
        <ChildComponent />
      </FormItemContextProvider>,
      {
        queryClient,
        appContextProps: { selectedFormLayoutName: layoutName },
        search: `?component=${componentId}&layout=${layoutName}`,
      },
    );
  };

  it('restores the component from the selected layout and selects it without saving it', async () => {
    renderAtComponentUrl(component1IdMock, FormItemId);
    expect(screen.getByTestId(formItemIdTestId)).toHaveTextContent(component1IdMock);
    await waitFor(() =>
      expect(appContextMock.setSelectedItem).toHaveBeenCalledWith({
        type: ItemType.Component,
        id: component1IdMock,
      }),
    );
    expect(queriesMock.saveFormLayout).not.toHaveBeenCalled();
  });

  it('does not restore a component that is not in the selected layout', () => {
    renderAtComponentUrl('missing-component', FormItemId);
    expect(screen.getByTestId(formItemIdTestId)).toBeEmptyDOMElement();
    expect(appContextMock.setSelectedItem).not.toHaveBeenCalled();
  });

  it('does not restore the component again after it has been discarded', async () => {
    renderAtComponentUrl(component1IdMock, () => {
      const { handleDiscard } = React.useContext(FormItemContext);
      return (
        <>
          <Button onClick={handleDiscard} />
          <FormItemId />
        </>
      );
    });
    expect(screen.getByTestId(formItemIdTestId)).toHaveTextContent(component1IdMock);
    await clickButton();
    expect(screen.getByTestId(formItemIdTestId)).toBeEmptyDOMElement();
  });
});

describe('FormItemContext with the app context and the properties panel', () => {
  const selectedItemIdTestId = 'selectedItemId';
  const componentHeading = () =>
    screen.findByRole('heading', {
      name: textMock(`ux_editor.component_title.${component1Mock.type}`),
      level: 2,
    });

  const SelectedItemId = () => {
    const { selectedItem } = useAppContext();
    return <div data-testid={selectedItemIdTestId}>{selectedItem?.id}</div>;
  };

  const createQueryClientWithLayouts = (): QueryClient => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.LayoutSets, org, app], [{ id: layoutSetName }]);
    queryClient.setQueryData(
      [QueryKey.FormLayoutSettings, org, app, layoutSetName],
      formLayoutSettingsMock,
    );
    queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], {
      [layoutName]: layoutMock,
    });
    return queryClient;
  };

  const renderPropertiesAtComponentUrl = (
    queryClient: QueryClient,
    queries: Partial<ServicesContextProps> = {},
  ) =>
    renderWithProviders(
      <AppContextProvider
        shouldReloadPreview={false}
        previewHasLoaded={vi.fn()}
        onLayoutSetNameChange={vi.fn()}
      >
        <FormItemContextProvider>
          <Properties />
          <SelectedItemId />
        </FormItemContextProvider>
      </AppContextProvider>,
      {
        queryClient,
        queries,
        search: `?component=${component1IdMock}&layout=${layoutName}`,
      },
    );

  it('keeps the component from the URL open in the properties panel', async () => {
    const queryClient = createQueryClientWithLayouts();
    queryClient.setQueryData([QueryKey.Pages, org, app, layoutSetName], pagesModelMock);
    renderPropertiesAtComponentUrl(queryClient);

    expect(await componentHeading()).toBeInTheDocument();
    expect(screen.getByTestId(selectedItemIdTestId)).toHaveTextContent(component1IdMock);
    expect(queriesMock.saveFormLayout).not.toHaveBeenCalled();
  });

  it('reselects the component from the URL when the pages load after the layouts', async () => {
    // Until the pages load, the panel has no item, and ComponentConfigPanel clears the selection while rendering.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let resolvePages: (pages: PagesModel) => void;
    const getPages = vi.fn(() => new Promise<PagesModel>((resolve) => (resolvePages = resolve)));
    renderPropertiesAtComponentUrl(createQueryClientWithLayouts(), { getPages });
    await waitFor(() => expect(getPages).toHaveBeenCalled());

    resolvePages(pagesModelMock);

    expect(await componentHeading()).toBeInTheDocument();
    expect(screen.getByTestId(selectedItemIdTestId)).toHaveTextContent(component1IdMock);
    expect(queriesMock.saveFormLayout).not.toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls.flat().join(' ')).toContain('Cannot update a component');
    consoleErrorSpy.mockRestore();
  });
});
