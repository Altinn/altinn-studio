import React from 'react';
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
import { app, org } from '@studio/testing/testids';
import { layout1NameMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';

const mockHandleDiscard = jest.fn();

describe('FormItemTitle', () => {
  afterEach(jest.clearAllMocks);

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
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));

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
    await waitFor(() => {
      expect(mockHandleDiscard).toHaveBeenCalledTimes(1);
    });
  });

  it('Does not call deleteItem when delete button is clicked, but deletion is not confirmed', async () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => false));
    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));

    expect(queriesMock.saveFormLayout).not.toHaveBeenCalled();
    expect(mockHandleDiscard).not.toHaveBeenCalled();
  });

  it('should prompt the user for confirmation before deleting the component', async () => {
    const component = componentMocks[ComponentType.Input];
    const label = 'Test label';

    const user = userEvent.setup();
    const mockedConfirm = jest.fn(() => true);
    jest.spyOn(window, 'confirm').mockImplementation(mockedConfirm);

    render(component, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(mockedConfirm).toBeCalledWith(textMock('ux_editor.component_deletion_text'));
  });

  it('should prompt the user for confirmation before deleting the container component and its children', async () => {
    const groupComponent = componentMocks[ComponentType.Group];
    const label = 'Test label';

    const user = userEvent.setup();
    const mockedConfirm = jest.fn(() => true);
    jest.spyOn(window, 'confirm').mockImplementation(mockedConfirm);

    render(groupComponent, label);

    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(mockedConfirm).toBeCalledWith(textMock('ux_editor.component_group_deletion_text'));
  });
});

const render = (formItem: FormComponent | FormContainer, label: string) =>
  renderWithProviders(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...{ handleDiscard: mockHandleDiscard },
      }}
    >
      <FormItemTitle formItem={formItem}>{label}</FormItemTitle>
    </FormItemContext.Provider>,
    {
      appContextProps: {},
    },
  );
