import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formLayoutSettingsMock, renderWithProviders } from '../../../../../testing/mocks';
import { FormItemTitle } from './FormItemTitle';
import type { FormComponent } from '../../../../../types/FormComponent';
import { componentMocks } from '../../../../../testing/componentMocks';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { type FormContainer } from '../../../../../types/FormContainer';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormItemContext,
  FormItemContextProvider,
  useFormItemContext,
} from '../../../../FormItemContext';
import { formItemContextProviderMock } from '../../../../../testing/formItemContextMocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock, queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@designer/testing/testids';
import {
  component1IdMock,
  componentWithOptionsMock,
  container1IdMock,
  layout1NameMock,
  layoutMock,
  pagesModelMock,
} from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { appContextMock } from '../../../../../testing/appContextMock';
import { AppContextProvider } from '../../../../../AppContext';
import { useSearchParams } from 'react-router-dom';

const mockHandleDiscard = vi.fn();

describe('FormItemTitle', () => {
  it('Renders children', () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    render(component, label);
    expect(screen.getByText('Test label')).toBeInTheDocument();
  });

  it('Calls deleteItem with item id when delete button is clicked and deletion is confirmed', async () => {
    // Test data
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(vi.fn(() => true));

    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      layoutSet1NameMock,
      {
        componentIdsChange: [
          {
            newComponentId: undefined,
            oldComponentId: component.id,
          },
        ],
        layout: expect.objectContaining({
          data: {
            layout: [],
          },
        }),
      },
    );
  });

  it('Does not call deleteItem when delete button is clicked, but deletion is not confirmed', async () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockImplementation(vi.fn(() => false));
    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    expect(queriesMock.saveFormLayout).not.toHaveBeenCalled();
    expect(mockHandleDiscard).not.toHaveBeenCalled();
  });

  it('should prompt the user for confirmation before deleting the component', async () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    const mockedConfirm = vi.fn(() => true);
    vi.spyOn(window, 'confirm').mockImplementation(mockedConfirm);

    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(mockedConfirm).toHaveBeenCalledWith(textMock('ux_editor.component_deletion_text'));
  });

  it('should prompt the user for confirmation before deleting the container component and its children', async () => {
    const groupComponent = componentMocks[ComponentType.Group];
    const label = 'Test label';

    const user = userEvent.setup();
    const mockedConfirm = vi.fn(() => true);
    vi.spyOn(window, 'confirm').mockImplementation(mockedConfirm);

    render(groupComponent, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(mockedConfirm).toHaveBeenCalledWith(textMock('ux_editor.component_group_deletion_text'));
  });

  describe('When a component is selected', () => {
    const selectedComponentId = component1IdMock;

    beforeEach(() => {
      queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
        [layout1NameMock]: layoutMock,
      });
      vi.spyOn(window, 'confirm').mockImplementation(vi.fn(() => true));
    });

    afterEach(() => {
      queryClientMock.clear();
    });

    it('Discards the selection when the selected component is deleted', async () => {
      const user = userEvent.setup();
      render(layoutMock.components[selectedComponentId], 'Test label', selectedComponentId);

      await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

      await waitFor(() => expect(mockHandleDiscard).toHaveBeenCalledTimes(1));
    });

    it('Discards the selection when the container of the selected component is deleted', async () => {
      const user = userEvent.setup();
      render(layoutMock.containers[container1IdMock], 'Test label', selectedComponentId);

      await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

      await waitFor(() => expect(mockHandleDiscard).toHaveBeenCalledTimes(1));
    });

    it('Keeps the selection when another component is deleted', async () => {
      const user = userEvent.setup();
      render(componentWithOptionsMock, 'Test label', selectedComponentId);

      await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

      await waitFor(() => expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1));
      expect(mockHandleDiscard).not.toHaveBeenCalled();
    });

    it('Discards the selection when the deleted component is selected before the deletion completes', async () => {
      const user = userEvent.setup();
      const { saveFormLayout, completeSave } = pendingSave();
      const { rerender } = render(componentWithOptionsMock, 'Test label', selectedComponentId, {
        saveFormLayout,
      });

      await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
      rerender(
        formItemTitleWithSelection(
          componentWithOptionsMock,
          'Test label',
          componentWithOptionsMock.id,
        ),
      );
      completeSave();

      await waitFor(() => expect(mockHandleDiscard).toHaveBeenCalledTimes(1));
    });

    it('Keeps the selection when another component is selected before the deletion of the selected one completes', async () => {
      const user = userEvent.setup();
      const { saveFormLayout, completeSave } = pendingSave();
      const deletedComponent = layoutMock.components[selectedComponentId];
      const { rerender } = render(deletedComponent, 'Test label', selectedComponentId, {
        saveFormLayout,
      });

      await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
      rerender(
        formItemTitleWithSelection(deletedComponent, 'Test label', componentWithOptionsMock.id),
      );
      completeSave();

      await waitFor(() => expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1));
      expect(mockHandleDiscard).not.toHaveBeenCalled();
    });
  });

  it('removes a deleted restored component from the URL and does not restore it again', async () => {
    const component = componentMocks[ComponentType.Input];
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { unmount } = renderRestoredFormItemTitle();

    await waitFor(() =>
      expect(screen.getByLabelText('Selected component')).toHaveTextContent(component.id),
    );
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    await waitFor(() =>
      expect(new URLSearchParams(screen.getByLabelText('Query').textContent).has('component')).toBe(
        false,
      ),
    );
    const remainingSearch = new URLSearchParams(screen.getByLabelText('Query').textContent);
    expect(remainingSearch.get('layout')).toBe(layout1NameMock);
    expect(remainingSearch.get('keep')).toBe('1');
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);

    unmount();
    renderRestoredFormItemTitle(`?${remainingSearch}`);
    expect(screen.getByLabelText('Selected component')).toBeEmptyDOMElement();
  });

  it('removes the deleted component from the URL before the preview finishes refreshing', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(
      <FormItemContext.Provider
        value={{ ...formItemContextProviderMock, formItemId: component1IdMock }}
      >
        <FormItemTitle formItem={componentMocks[ComponentType.Input]}>Input</FormItemTitle>
        <SelectionState />
      </FormItemContext.Provider>,
      {
        appContextProps: { updateLayoutsForPreview: vi.fn(() => new Promise<void>(() => {})) },
        search: `?component=${componentMocks[ComponentType.Input].id}&layout=${layout1NameMock}`,
      },
    );

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    await waitFor(() =>
      expect(screen.getByLabelText('Query').textContent).toBe(`layout=${layout1NameMock}`),
    );
  });

  it('keeps the restored selection and URL when deletion is cancelled', async () => {
    const component = componentMocks[ComponentType.Input];
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderRestoredFormItemTitle();

    await waitFor(() =>
      expect(screen.getByLabelText('Selected component')).toHaveTextContent(component.id),
    );
    const originalSearch = screen.getByLabelText('Query').textContent;
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    expect(screen.getByLabelText('Query').textContent).toBe(originalSearch);
    expect(screen.getByLabelText('Selected component')).toHaveTextContent(component.id);
    expect(queriesMock.saveFormLayout).not.toHaveBeenCalled();
  });

  it('keeps the selected component in the URL when another component is deleted', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const updateLayoutsForPreview = vi.fn(() => Promise.resolve());
    const search = `component=${component1IdMock}&layout=${layout1NameMock}`;
    renderWithProviders(
      <FormItemContext.Provider
        value={{ ...formItemContextProviderMock, formItemId: component1IdMock }}
      >
        <FormItemTitle formItem={componentWithOptionsMock}>Options</FormItemTitle>
        <SelectionState />
      </FormItemContext.Provider>,
      { appContextProps: { updateLayoutsForPreview }, search: `?${search}` },
    );

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    await waitFor(() => expect(updateLayoutsForPreview).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Query').textContent).toBe(search);
  });
});

const render = (
  formItem: FormComponent | FormContainer,
  label: string,
  selectedItemId: string = null,
  queries: Partial<ServicesContextProps> = {},
) =>
  renderWithProviders(formItemTitleWithSelection(formItem, label, selectedItemId), {
    appContextProps: {},
    queries,
  });

const formItemTitleWithSelection = (
  formItem: FormComponent | FormContainer,
  label: string,
  selectedItemId: string,
) => (
  <FormItemContext.Provider
    value={{
      ...formItemContextProviderMock,
      ...{ formItemId: selectedItemId, handleDiscard: mockHandleDiscard },
    }}
  >
    <FormItemTitle formItem={formItem}>{label}</FormItemTitle>
  </FormItemContext.Provider>
);

const pendingSave = () => {
  let completeSave: () => void;
  const save = new Promise<void>((resolve) => {
    completeSave = resolve;
  });
  return { saveFormLayout: vi.fn(() => save), completeSave };
};

const SelectionState = () => {
  const { formItemId } = useFormItemContext();
  const [searchParams] = useSearchParams();
  return (
    <>
      <output aria-label='Selected component'>{formItemId}</output>
      <output aria-label='Query'>{searchParams.toString()}</output>
    </>
  );
};

const renderRestoredFormItemTitle = (
  search = `?component=${componentMocks[ComponentType.Input].id}&layout=${layout1NameMock}&keep=1`,
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], [{ id: layoutSet1NameMock }]);
  queryClient.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, layoutSet1NameMock],
    formLayoutSettingsMock,
  );
  queryClient.setQueryData([QueryKey.Pages, org, app, layoutSet1NameMock], pagesModelMock);
  queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSet1NameMock], {
    [layout1NameMock]: layoutMock,
  });

  return renderWithProviders(
    <AppContextProvider
      shouldReloadPreview={false}
      previewHasLoaded={vi.fn()}
      onLayoutSetNameChange={vi.fn()}
    >
      <FormItemContextProvider>
        <FormItemTitle formItem={componentMocks[ComponentType.Input]}>Input</FormItemTitle>
        <SelectionState />
      </FormItemContextProvider>
    </AppContextProvider>,
    { queryClient, search },
  );
};
