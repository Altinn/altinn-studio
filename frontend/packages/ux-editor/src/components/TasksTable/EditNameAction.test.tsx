import React from 'react';
import { renderWithProviders } from '../../testing/mocks';
import { EditNameAction, type EditNameActionProps } from './EditNameAction';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ITextResources } from 'app-shared/types/global';

const currentName = 'konnichiwa';
const newName = 'shalom';
const textResourceId = 'textresource-id';
const lang = 'nb';

const textResources: ITextResources = {
  nb: [
    {
      id: textResourceId,
      value: currentName,
    },
  ],
};

describe('EditNameAction', () => {
  afterEach(jest.clearAllMocks);

  it('should render the task type in the text area if no name is set', async () => {
    const taskWithoutName: TaskNavigationGroup = {
      taskType: 'data',
    };
    renderEditNameAction({ task: taskWithoutName });

    await clickEditNameButton();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(textMock('ux_editor.task_table_type.data'));
  });

  it('should send a call to backend with the new name', async () => {
    const user = userEvent.setup();
    renderEditNameAction();

    await clickEditNameButton();
    await updateName();

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, lang, {
      'textresource-id': newName,
    });
  });

  it('should revert the changes in backend if user cancel the changes', async () => {
    const user = userEvent.setup();
    renderEditNameAction();
    await clickEditNameButton();
    await updateName();
    await user.tab();

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, lang, {
      'textresource-id': newName,
    });
    (queriesMock.upsertTextResources as jest.Mock).mockClear();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);

    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, lang, {
      'textresource-id': currentName,
    });
  });
});

const clickEditNameButton = async () => {
  const user = userEvent.setup();
  const editNameButton = screen.getByRole('button', {
    name: textMock('ux_editor.task_table.menu_edit_name'),
  });
  await user.click(editNameButton);
};

const updateName = async () => {
  const user = userEvent.setup();
  const textarea = screen.getByRole('textbox');
  await user.clear(textarea);
  await user.type(textarea, newName);
};

const renderEditNameAction = (props: Partial<EditNameActionProps> = {}) => {
  const defaultProps: EditNameActionProps = {
    task: {
      taskType: 'data',
      name: textResourceId,
    },
    tasks: [],
    index: 0,
    handleUpdateTaskNavigationGroup: jest.fn(),
  };

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);

  const mergedProps = { ...defaultProps, ...props };
  return renderWithProviders(<EditNameAction {...mergedProps} />, { queryClient });
};
