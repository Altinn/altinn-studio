import React from 'react';
import { renderWithProviders } from '../../testing/mocks';
import { EditNameAction, type EditNameActionProps } from './EditNameAction';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
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
const textResorceId2 = 'textresource-id-2';

const textResources: ITextResources = {
  nb: [
    {
      id: textResourceId,
      value: currentName,
    },
    {
      id: textResorceId2,
      value: newName,
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

  it('should set the new text resource id and value when selecting a different text resource id', async () => {
    const user = userEvent.setup();
    renderEditNameAction();

    await clickEditNameButton();

    const textResourcesTab = screen.getByRole('tab', {
      name: textMock('ux_editor.text_resource_binding_search'),
    });
    await user.click(textResourcesTab);

    const combobox = screen.getByRole('combobox');
    const textResorceId2Option = screen.getByRole('option', {
      name: textResorceId2,
    });
    await user.selectOptions(combobox, textResorceId2Option);

    const textInputTab = screen.getByRole('tab', {
      name: textMock('ux_editor.text_resource_binding_write'),
    });
    await user.click(textInputTab);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(newName);
  });

  it('should close the modal when clicking the cancel button', async () => {
    const user = userEvent.setup();
    renderEditNameAction();

    await clickEditNameButton();
    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);

    const textarea = screen.queryByRole('textbox');
    expect(textarea).not.toBeInTheDocument();
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
    setPopoverOpen: jest.fn(),
  };

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);

  const mergedProps = { ...defaultProps, ...props };
  return renderWithProviders(<EditNameAction {...mergedProps} />, { queryClient });
};
