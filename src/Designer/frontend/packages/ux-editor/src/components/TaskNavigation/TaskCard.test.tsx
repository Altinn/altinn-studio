import { TaskCard } from './TaskCard';
import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders, type ExtendedRenderOptions } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('taskCard', () => {
  let confirmSpy: jest.SpyInstance;

  beforeAll(() => {
    confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));
  });

  afterAll(() => {
    confirmSpy.mockRestore();
  });

  it('should display popover when clicking ellipsis button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
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

  it('should show deletion button for subform', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
    expect(screen.getByRole('button', { name: /general.delete/ })).toBeInTheDocument();
  });

  it('should call delete layout set mutation when clicking delete button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
    await user.click(screen.getByRole('button', { name: /general.delete/ }));
    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledWith(org, app, 'test');
  });

  it('should open edit mode when clicking edit button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.edit/ }));

    expect(screen.getByRole('button', { name: /general.save/ })).toBeInTheDocument();
  });

  it('should display export button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.top_bar.export_form') }),
    ).toBeInTheDocument();
  });

  it('should exit save mode when closing', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.edit/ }));
    await user.click(screen.getByRole('button', { name: /general.cancel/ }));
    expect(screen.queryByRole('button', { name: /general.save/ })).not.toBeInTheDocument();
  });

  it('should exit save mode when saving', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByRole('button', { name: textMock('general.menu') }));
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.edit/ }));
    await user.type(
      screen.getByRole('textbox', { name: /ux_editor.task_card.subform_name_label/ }),
      'test',
    );
    await user.click(screen.getByRole('button', { name: /general.save/ }));
    expect(screen.queryByRole('button', { name: /general.save/ })).not.toBeInTheDocument();
  });
});

const render = (extendedRenderOptions?: Partial<ExtendedRenderOptions>) => {
  const layoutSet: LayoutSetModel = {
    id: 'test',
    dataType: 'datamodell123',
    type: 'subform',
    task: { id: null, type: null },
  };
  renderWithProviders(<TaskCard layoutSetModel={layoutSet} />, extendedRenderOptions);
};
