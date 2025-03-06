import { TaskCard } from './TaskCard';
import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { studioIconCardPopoverTrigger } from '@studio/testing/testids';
import { renderWithProviders } from '../../testing/mocks';

describe('taskCard', () => {
  it('should display popover when clicking ellipsis button', async () => {
    const user = userEvent.setup();
    render();
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

  it('should open edit mode when clicking edit button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.edit/ }));

    expect(screen.getByRole('button', { name: /general.save/ })).toBeInTheDocument();
  });

  it('should exit save mode when closing', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.edit/ }));
    await user.click(screen.getByRole('button', { name: /general.close/ }));
    expect(screen.queryByRole('button', { name: /general.save/ })).not.toBeInTheDocument();
  });

  it('should exit save mode when saving', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.edit/ }));
    await user.type(
      screen.getByRole('textbox', { name: /ux_editor.component_properties.layoutSet/ }),
      'test',
    );
    await user.click(screen.getByRole('button', { name: /general.save/ }));
    expect(screen.queryByRole('button', { name: /general.save/ })).not.toBeInTheDocument();
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
