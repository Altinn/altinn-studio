import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../testing/mocks';
import { FormItemTitle } from './FormItemTitle';
import type { FormComponent } from '../../../../../types/FormComponent';
import { componentMocks } from '../../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { type FormContainer } from '../../../../../types/FormContainer';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormItemContext } from '../../../../FormItemContext';
import { formItemContextProviderMock } from '../../../../../testing/formItemContextMocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import {
  component1IdMock,
  componentWithOptionsMock,
  container1IdMock,
  layout1NameMock,
  layoutMock,
} from '@altinn/ux-editor-v4/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v4/testing/layoutSetsMock';
import { appContextMock } from '../../../../../testing/appContextMock';

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
  });
});

const render = (
  formItem: FormComponent | FormContainer,
  label: string,
  selectedItemId: string = null,
) =>
  renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...{ formItemId: selectedItemId, handleDiscard: mockHandleDiscard },
      }}
    >
      <FormItemTitle formItem={formItem}>{label}</FormItemTitle>
    </FormItemContext.Provider>,
    {
      appContextProps: {},
    },
  );
