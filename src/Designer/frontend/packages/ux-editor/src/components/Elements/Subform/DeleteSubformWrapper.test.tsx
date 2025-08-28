import React from 'react';
import { DeleteSubformWrapper } from './DeleteSubformWrapper';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  layoutSetsMock,
  layoutSet1NameMock,
  layoutSet3SubformNameMock,
} from '../../../testing/layoutSetsMock';
import { renderWithProviders } from '../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';

describe('DeleteSubformWrapper', () => {
  it('should not render delete button when selected layout set is not a subform', () => {
    renderDeleteSubformWrapper(layoutSet1NameMock);
    const deleteSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).not.toBeInTheDocument();
  });

  it('should render delete button when selected layoutset is a subform', () => {
    renderDeleteSubformWrapper(layoutSet3SubformNameMock);

    const deleteSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).toBeInTheDocument();
  });

  it('should not call deleteLayoutSet when delete button is clicked but not confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => false);
    const deleteLayoutSet = jest.fn();
    const user = userEvent.setup();
    renderDeleteSubformWrapper(layoutSet3SubformNameMock, { deleteLayoutSet });

    const deleteSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    await user.click(deleteSubformButton);

    expect(deleteLayoutSet).not.toHaveBeenCalled();
  });

  it('should call deleteLayoutSet when delete button is clicked and confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const deleteLayoutSet = jest.fn();
    const user = userEvent.setup();
    renderDeleteSubformWrapper(layoutSet3SubformNameMock, { deleteLayoutSet });

    const deleteSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    await user.click(deleteSubformButton);

    expect(deleteLayoutSet).toHaveBeenCalled();
    expect(deleteLayoutSet).toHaveBeenCalledWith(org, app, layoutSet3SubformNameMock);
  });
});

const renderDeleteSubformWrapper = (
  selectedLayoutSet: string,
  queries: Partial<ServicesContextProps> = {},
) => {
  return renderWithProviders(
    <DeleteSubformWrapper layoutSets={layoutSetsMock} selectedLayoutSet={selectedLayoutSet} />,
    { queries },
  );
};
