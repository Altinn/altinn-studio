import React from 'react';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import userEvent from '@testing-library/user-event';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { TaskCardEditing, type TaskCardEditingProps } from './TaskCardEditing';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const updateProcessDataTypesMutation = jest.fn().mockImplementation((params, options) => {
  console.log('updateProcessDataTypesMutation');
  console.log(params);
  console.log(options);
  options.onSettled();
});
const updateLayoutSetIdMutation = jest.fn().mockImplementation((params, options) => {
  console.log('updateLayoutSetIdMutation');
  console.log(params);
  console.log(options);
  options.onSettled();
});
jest.mock('app-development/hooks/mutations/useUpdateProcessDataTypesMutation', () => ({
  useUpdateProcessDataTypesMutation: () => ({ mutate: updateProcessDataTypesMutation }),
}));
jest.mock('app-development/hooks/mutations/useUpdateLayoutSetIdMutation', () => ({
  useUpdateLayoutSetIdMutation: () => ({ mutate: updateLayoutSetIdMutation }),
}));

describe('taskCard', () => {
  it('should render with disabled save button without changes', () => {
    render();
    expect(screen.getByRole('button', { name: /general.save/ })).toBeDisabled();
  });

  it('should call onClose when clicking close button', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });
    await user.click(screen.getByRole('button', { name: /general.close/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call updateLayoutSetidMutation when layout set id is changed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });
    await user.clear(
      screen.getByRole('textbox', { name: /ux_editor.component_properties.layoutSet/ }),
    );
    const newLayoutSetId = 'CoolLayoutName';
    await user.type(
      screen.getByRole('textbox', { name: /ux_editor.component_properties.layoutSet/ }),
      newLayoutSetId,
    );
    await user.click(screen.getByRole('button', { name: /general.save/ }));
    expect(updateLayoutSetIdMutation).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetIdMutation).toHaveBeenCalledWith(
      {
        layoutSetIdToUpdate: mockLayoutSet.id,
        newLayoutSetId: newLayoutSetId,
      },
      expect.anything(),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call updateProcessDataTypesMutation when datamodel id is changed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });
    await act(async () => {
      await user.selectOptions(
        screen.getByRole('combobox', { name: /ux_editor.modal_properties_data_model_binding/ }),
        'unuseddatamodel',
      );
    });
    await user.click(screen.getByRole('button', { name: /general.save/ }));
    expect(updateProcessDataTypesMutation).toHaveBeenCalledTimes(1);
    expect(updateProcessDataTypesMutation).toHaveBeenCalledWith(
      {
        layoutSetIdToUpdate: mockLayoutSet.id,
        newLayoutSetId: '',
      },
      expect.anything(),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should show validation error when inputting invalid id', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render({ onClose });
    await user.type(
      screen.getByRole('textbox', { name: /ux_editor.component_properties.layoutSet/ }),
      ' test4! &',
    );
    expect(
      screen.getByRole('textbox', { name: /ux_editor.component_properties.layoutSet/ }),
    ).toBeInvalid();
    expect(screen.getByRole('button', { name: /general.save/ })).toBeDisabled();
  });
});

const mockLayoutSet: LayoutSetModel = {
  id: 'test',
  dataType: 'datamodell123',
  type: 'subform',
  task: { id: null, type: null },
};

const render = (props?: Partial<TaskCardEditingProps>) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.AppMetadataModelIds, org, app, true],
    ['datamodell123', 'unuseddatamodel'],
  );
  renderWithProviders(
    <TaskCardEditing layoutSetModel={mockLayoutSet} onClose={jest.fn()} {...props} />,
    { queryClient },
  );
};
