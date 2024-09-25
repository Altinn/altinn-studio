import React from 'react';
import { DeleteSubFormWrapper } from './DeleteSubFormWrapper';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  layoutSetsMock,
  layoutSet1NameMock,
  layoutSet3SubFormNameMock,
} from '@altinn/ux-editor/testing/layoutSetsMock';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';

describe('DeleteSubFormWrapper', () => {
  it('should disable delete button when selected layoutset is not a subform', () => {
    renderDeleteSubFormWrapper(layoutSet1NameMock);

    const deleteSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.sub_form'),
    });
    expect(deleteSubFormButton).toBeDisabled();
  });

  it('should enable delete button when selected layoutset is a subform', () => {
    renderDeleteSubFormWrapper(layoutSet3SubFormNameMock);

    const deleteSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.sub_form'),
    });
    expect(deleteSubFormButton).toBeEnabled();
  });

  it('should not call deleteLayoutSet when delete button is clicked but not confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    const deleteLayoutSet = jest.fn();
    const user = userEvent.setup();
    renderDeleteSubFormWrapper(layoutSet3SubFormNameMock, { deleteLayoutSet });

    const deleteSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.sub_form'),
    });
    await user.click(deleteSubFormButton);

    expect(deleteLayoutSet).not.toHaveBeenCalled();
  });

  it('should call deleteLayoutSet when delete button is clicked and confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const deleteLayoutSet = jest.fn();
    const user = userEvent.setup();
    renderDeleteSubFormWrapper(layoutSet3SubFormNameMock, { deleteLayoutSet });

    const deleteSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.sub_form'),
    });
    await user.click(deleteSubFormButton);

    expect(deleteLayoutSet).toHaveBeenCalled();
    expect(deleteLayoutSet).toHaveBeenCalledWith(org, app, layoutSet3SubFormNameMock);
  });
});

const renderDeleteSubFormWrapper = (
  selectedLayoutSet: string,
  queries: Partial<ServicesContextProps> = {},
) => {
  return renderWithProviders(
    <DeleteSubFormWrapper layoutSets={layoutSetsMock} selectedLayoutSet={selectedLayoutSet} />,
    { queries },
  );
};
