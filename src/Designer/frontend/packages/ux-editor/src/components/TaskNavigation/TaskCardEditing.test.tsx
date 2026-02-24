import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { TaskCardEditing, type TaskCardEditingProps } from './TaskCardEditing';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const updateProcessDataTypesMutation = jest.fn().mockImplementation((params, options) => {
  options.onSettled();
});
const updateLayoutSetIdMutation = jest.fn().mockImplementation((params, options) => {
  options.onSettled();
});
jest.mock('app-development/hooks/mutations/useUpdateProcessDataTypesMutation', () => ({
  useUpdateProcessDataTypesMutation: () => ({ mutate: updateProcessDataTypesMutation }),
}));
jest.mock('app-development/hooks/mutations/useUpdateLayoutSetIdMutation', () => ({
  useUpdateLayoutSetIdMutation: () => ({ mutate: updateLayoutSetIdMutation }),
}));

const datamodels = ['datamodell123', 'unuseddatamodel'];
const dataTaskLayoutSet: LayoutSetModel = {
  id: 'dataTaskLayoutSet1',
  dataType: datamodels[0],
  type: null,
  task: { id: 'activity-123', type: 'DataTask' },
};

const subformLayoutSet: LayoutSetModel = {
  id: 'test',
  dataType: datamodels[0],
  type: 'subform',
  task: null,
};

const customReceiptLayoutSet: LayoutSetModel = {
  id: 'test',
  dataType: datamodels[0],
  type: '',
  task: { id: 'CustomReceipt', type: 'CustomReceipt' },
};

describe('taskCard', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));
    jest.clearAllMocks();
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('should render with disabled save button without changes', () => {
    render();
    expect(screen.getByRole('button', { name: /general.save/ })).toBeDisabled();
  });

  it('should render a task name label when editing a non-subform', () => {
    render({ layoutSetModel: dataTaskLayoutSet });
    expect(layoutSetNameTextbox()).toBeInTheDocument();
  });

  it('should render a subform name label when editing a subform', () => {
    render({ layoutSetModel: subformLayoutSet });
    expect(subformNameTextbox()).toBeInTheDocument();
  });

  it('should show alert when changing data model', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose, layoutSetModel: customReceiptLayoutSet });

    await user.selectOptions(dataModelBindingCombobox(), datamodels[1]);
    expect(confirmSpy.getMockImplementation()).toHaveBeenCalledTimes(0);
    await user.click(screen.getByRole('button', { name: /general.save/ }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(confirmSpy.getMockImplementation()).toHaveBeenCalledTimes(1);
  });

  it('should cancel save if clicking cancel on datamodel alert', async () => {
    confirmSpy.mockImplementation(jest.fn(() => false));
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose, layoutSetModel: customReceiptLayoutSet });

    await user.selectOptions(dataModelBindingCombobox(), datamodels[1]);
    expect(confirmSpy.getMockImplementation()).toHaveBeenCalledTimes(0);
    await user.click(screen.getByRole('button', { name: /general.save/ }));

    expect(onClose).toHaveBeenCalledTimes(0);
    expect(confirmSpy.getMockImplementation()).toHaveBeenCalledTimes(1);
    expect(updateProcessDataTypesMutation).toHaveBeenCalledTimes(0);
    expect(updateLayoutSetIdMutation).toHaveBeenCalledTimes(0);
  });

  it('should not show alert when not changing data model', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose, layoutSetModel: customReceiptLayoutSet });

    await user.type(layoutSetNameTextbox(), 'test');
    await user.click(screen.getByRole('button', { name: /general.save/ }));
  });

  it('should call onClose when clicking close button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });

    await user.click(screen.getByRole('button', { name: /general.cancel/ }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call updateLayoutSetidMutation when layout set id is changed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });

    await user.clear(layoutSetNameTextbox());
    const newLayoutSetId = 'CoolLayoutName';
    await user.type(layoutSetNameTextbox(), newLayoutSetId);
    await user.click(screen.getByRole('button', { name: /general.save/ }));

    expect(updateLayoutSetIdMutation).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetIdMutation).toHaveBeenCalledWith(
      {
        layoutSetIdToUpdate: dataTaskLayoutSet.id,
        newLayoutSetId: newLayoutSetId,
      },
      expect.anything(),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('should be able to update layoutSetId with enter-key', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });

    await user.clear(layoutSetNameTextbox());
    const newLayoutSetId = 'CoolLayoutName';
    await user.type(layoutSetNameTextbox(), newLayoutSetId);
    await user.type(layoutSetNameTextbox(), '{enter}');

    expect(updateLayoutSetIdMutation).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetIdMutation).toHaveBeenCalledWith(
      {
        layoutSetIdToUpdate: dataTaskLayoutSet.id,
        newLayoutSetId: newLayoutSetId,
      },
      expect.anything(),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('should call updateProcessDataTypesMutation when datamodel id is changed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose, layoutSetModel: customReceiptLayoutSet });

    await user.selectOptions(dataModelBindingCombobox(), datamodels[1]);
    await user.click(screen.getByRole('button', { name: /general.save/ }));

    expect(updateProcessDataTypesMutation).toHaveBeenCalledTimes(1);
    expect(updateProcessDataTypesMutation).toHaveBeenCalledWith(
      {
        connectedTaskId: customReceiptLayoutSet.task?.id,
        newDataTypes: [datamodels[1]],
      },
      expect.anything(),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(confirmSpy.getMockImplementation()).toHaveBeenCalledTimes(1);
  });

  it('should show validation error when inputting invalid id', async () => {
    const user = userEvent.setup();
    const invalidLayoutName = ' test4! &';
    render();

    await user.type(layoutSetNameTextbox(), invalidLayoutName);

    expect(layoutSetNameTextbox()).toBeInvalid();
    expect(screen.getByRole('button', { name: /general.save/ })).toBeDisabled();
  });

  it('should show default "choose model" option if layoutset dataType is null', () => {
    render({ layoutSetModel: { ...dataTaskLayoutSet, dataType: null } });

    expect(dataModelBindingCombobox()).toHaveTextContent('ux_editor.task_card.choose_datamodel');
  });
});

const render = (props?: Partial<TaskCardEditingProps>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppMetadataModelIds, org, app, true], datamodels);
  renderWithProviders(
    <TaskCardEditing layoutSetModel={dataTaskLayoutSet} onClose={jest.fn()} {...props} />,
    { queryClient },
  );
};

const layoutSetNameTextbox = (): Element =>
  screen.getByRole('textbox', { name: /ux_editor.task_card.task_name_label/ });

const subformNameTextbox = (): Element =>
  screen.getByRole('textbox', { name: /ux_editor.task_card.subform_name_label/ });

const dataModelBindingCombobox = (): Element =>
  screen.getByRole('combobox', { name: /ux_editor.modal_properties_data_model_binding/ });
