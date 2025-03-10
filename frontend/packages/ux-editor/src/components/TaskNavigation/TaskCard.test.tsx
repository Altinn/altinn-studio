import { TaskCard } from './TaskCard';
import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { studioIconCardPopoverTrigger } from '@studio/testing/testids';
import { renderWithProviders } from '../../testing/mocks';

describe('taskCard', () => {
  it('should display popover when clicking ellipsis button', async () => {
    render();
    const user = userEvent.setup();
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    expect(screen.getByRole('button', { name: /general.delete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ux_editor.task_card.edit/ })).toBeInTheDocument();
  });

  it('should display datatype id', async () => {
    render();
    expect(screen.getByText(/ux_editor.task_card.datamodel.*datamodell123/)).toBeInTheDocument();
  });

  it('should display task type', async () => {
    render();
    expect(screen.getByText(/ux_editor.subform/)).toBeInTheDocument();
  });
});

const render = () => {
  const layoutSet: LayoutSetModel = {
    id: 'test',
    dataType: 'datamodell123',
    type: 'subform',
    task: { id: null, type: null },
  };
  renderWithProviders(<TaskCard layoutSetModel={layoutSet} />);
};
