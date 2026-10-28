import { describe, expect, it, vi } from 'vitest';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormAttachmentListComponent } from '../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../componentConfig';
import { renderWithProviders } from '../../../../testing/mocks';
import { AttachmentListComponent } from './AttachmentListComponent';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { reservedDataTypes } from './attachmentListUtils';
import { app, org } from '@studio/testing/testids';

const user = userEvent.setup();

const defaultLayoutSets: LayoutSets = [
  {
    id: 'layoutSetId1',
    dataType: 'layoutSetId1',
    taskId: 'Task_1',
  },
  {
    id: 'layoutSetId2',
    dataType: 'layoutSetId2',
    taskId: 'Task_2',
  },
  {
    id: 'layoutSetId3',
    dataType: 'layoutSetId3',
    taskId: 'Task_3',
  },
  {
    id: 'layoutSetId4',
    dataType: 'layoutSetId4',
    taskId: 'CustomReceipt',
  },
];

const defaultDataTypes: DataTypeElement[] = [
  { id: 'test1', taskIds: ['Task_1'] },
  { id: 'test2', taskIds: ['Task_1'], appLogic: {} },
  { id: 'test3', taskIds: ['Task_2'] },
  { id: 'test4', taskIds: ['Task_3'] },
  { id: 'test5', taskIds: ['Task_3'] },
  { id: reservedDataTypes.refDataAsPdf },
];

const defaultComponent: FormAttachmentListComponent = {
  id: '1',
  type: ComponentType.AttachmentList,
};

const handleComponentChange = vi.fn();

const defaultProps: IGenericEditComponent<ComponentType.AttachmentList> = {
  component: defaultComponent,
  handleComponentChange,
};

const render = async (
  props: Partial<IGenericEditComponent<ComponentType.AttachmentList>> = {},
  selectedLayoutSet: string = 'layoutSetId2',
  layoutSets: LayoutSets = defaultLayoutSets,
  dataTypes: DataTypeElement[] = defaultDataTypes,
  isDataFetched: boolean = true,
) => {
  const client = createQueryClientMock();
  if (isDataFetched) {
    client.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);
    client.setQueryData([QueryKey.AppMetadata, org, app], { dataTypes });
  }
  return renderWithProviders(<AttachmentListComponent {...defaultProps} {...props} />, {
    queryClient: client,
    uxEditorParams: {
      layoutSet: selectedLayoutSet,
    },
  });
};

describe('AttachmentListComponent', () => {
  it('should render spinner when appMetadata is pending', () => {
    render({}, undefined, defaultLayoutSets, defaultDataTypes, false);

    const spinnerLabel = screen.getByLabelText(textMock('ux_editor.component_properties.loading'));
    expect(spinnerLabel).toBeInTheDocument();
  });

  it('should render AttachmentList component', async () => {
    await render();
    expect(
      screen.getByLabelText(textMock('ux_editor.component_properties.select_attachments')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', {
        name: textMock('ux_editor.component_properties.current_task'),
      }),
    ).toBeInTheDocument();
  });

  it('should display all attachments selected as default when dataTypeIds is undefined', async () => {
    await render();
    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.select_all_attachments'),
    });
    expect(selectAllCheckbox).toBeChecked();
  });

  it('should save to backend when toggle of pdf', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test3', 'test4'],
        },
      },
      'layoutSetId4',
    );

    const includePdfCheckbox = screen.getByRole('switch', {
      name: textMock('ux_editor.component_properties.select_pdf'),
    });

    await user.click(includePdfCheckbox);
    expect(includePdfCheckbox).toBeChecked();
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test3', 'test4', reservedDataTypes.refDataAsPdf],
    });
    expect(handleComponentChange).toHaveBeenCalledTimes(1);

    await user.click(includePdfCheckbox);
    expect(includePdfCheckbox).not.toBeChecked();
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test3', 'test4'],
    });
    expect(handleComponentChange).toHaveBeenCalledTimes(2);
  });

  it('should not display pdf checkbox when current task is not CustomReceipt', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
        },
      },
      'layoutSetId3',
    );

    expect(
      screen.queryByRole('switch', {
        name: textMock('ux_editor.component_properties.select_pdf'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should save to backend when toggle of current task and output is valid', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test3', 'test4', reservedDataTypes.refDataAsPdf],
        },
      },
      'layoutSetId3',
    );

    const currentTaskCheckbox = screen.getByRole('switch', {
      name: textMock('ux_editor.component_properties.current_task'),
    });

    await user.click(currentTaskCheckbox);
    expect(currentTaskCheckbox).toBeChecked();

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test4', reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
    });
    // Combobox is also triggered, because current task is set to true and makes the combobox to trigger onChangeValue because of filter update
    expect(handleComponentChange).toHaveBeenCalledTimes(1);

    await user.click(currentTaskCheckbox);
    expect(currentTaskCheckbox).not.toBeChecked();
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test4', reservedDataTypes.refDataAsPdf],
    });
    expect(handleComponentChange).toHaveBeenCalledTimes(2);
  });

  it('should not save to backend when current task is set to true and output is invalid (no selected attachments)', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test3'],
        },
      },
      'layoutSetId3',
    );

    const currentTaskCheckbox = screen.getByRole('switch', {
      name: textMock('ux_editor.component_properties.current_task'),
    });

    await user.click(currentTaskCheckbox);
    expect(currentTaskCheckbox).toBeChecked();

    expect(handleComponentChange).not.toHaveBeenCalled();
  });

  it('should treat a data type whose taskIds lists the current task among others as an attachment of the current task', async () => {
    const dataTypes: DataTypeElement[] = [
      { id: 'test1', taskIds: ['Task_1'] },
      { id: 'test2', taskIds: ['Task_1', 'Task_3'] },
      { id: 'test4', taskIds: ['Task_3'] },
    ];
    await render(
      { component: { ...defaultComponent, dataTypeIds: ['test1', 'test2'] } },
      'layoutSetId3',
      defaultLayoutSets,
      dataTypes,
    );

    await user.click(getCurrentTaskSwitch());

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test2', reservedDataTypes.currentTask],
    });
  });

  it('should ignore taskId and treat a data type without taskIds as bound to no task', async () => {
    const dataTypes: DataTypeElement[] = [
      { id: 'test2', taskIds: ['Task_3'] },
      { id: 'test3', taskId: 'Task_3' },
      { id: 'test4', taskId: 'Task_3', taskIds: [] },
      { id: 'test5', taskId: 'Task_1', taskIds: ['Task_3'] },
    ];
    await render(
      { component: { ...defaultComponent, dataTypeIds: ['test3', 'test4', 'test5'] } },
      'layoutSetId3',
      defaultLayoutSets,
      dataTypes,
    );

    await user.click(getCurrentTaskSwitch());

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test5', reservedDataTypes.currentTask],
    });
  });

  it('should handle toggle of "Select All Attachments" checkbox correctly', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test3'],
        },
      },
      'layoutSetId3',
    );

    const selectAllCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.select_all_attachments'),
    });
    await user.click(selectAllCheckbox);
    expect(selectAllCheckbox).toBeChecked();

    // Combobox is also triggered, because current task is set to true and makes the combobox to trigger onChangeValue because of filter update
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: [],
    });
    expect(handleComponentChange).toHaveBeenCalledTimes(1);

    handleComponentChange.mockClear();
    await user.click(selectAllCheckbox);
    expect(selectAllCheckbox).not.toBeChecked();

    expect(handleComponentChange).not.toHaveBeenCalled();
    const errorMessage = await waitFor(() =>
      screen.findByText(textMock('ux_editor.component_title.AttachmentList_error')),
    );
    expect(errorMessage).toBeInTheDocument();
  });
});

const getCurrentTaskSwitch = (): HTMLElement =>
  screen.getByRole('switch', { name: textMock('ux_editor.component_properties.current_task') });
