import { TaskCard } from './TaskCard';
import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { app, org, studioIconCardPopoverTrigger } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderWithProviders, type ExtendedRenderOptions } from '../../testing/mocks';

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
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    expect(screen.getByRole('button', { name: /general.delete/ })).toBeInTheDocument();
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
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    expect(screen.getByRole('button', { name: /general.delete/ })).toBeInTheDocument();
  });

  it('should call delete layout set mutation when clicking delete button', async () => {
    const user = userEvent.setup();
    render();
    await user.click(screen.getByTestId(studioIconCardPopoverTrigger));
    await user.click(screen.getByRole('button', { name: /general.delete/ }));
    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledWith(org, app, 'test');
  });

  it('should set selected form layout set name when clicking on navigation button', async () => {
    const user = userEvent.setup();
    const setSelectedFormLayoutSetName = jest.fn();

    render({ appContextProps: { setSelectedFormLayoutSetName } });
    await user.click(screen.getByRole('button', { name: /ux_editor.task_card.ux_editor/ }));
    expect(setSelectedFormLayoutSetName).toHaveBeenCalledWith('test');
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
