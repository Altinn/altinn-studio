import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAttachmentListComponent } from '../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../componentConfig';
import { renderWithProviders } from '../../../../testing/mocks';
import { AttachmentListComponent } from './AttachmentListComponent';
import React from 'react';
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

const defaultLayoutSets: LayoutSets = {
  sets: [
    {
      id: 'layoutSetId1',
      dataType: 'layoutSetId1',
      tasks: ['Task_1'],
    },
    {
      id: 'layoutSetId2',
      dataType: 'layoutSetId2',
      tasks: ['Task_2'],
    },
    {
      id: 'layoutSetId3',
      dataType: 'layoutSetId3',
      tasks: ['Task_3'],
    },
    {
      id: 'layoutSetId4',
      dataType: 'layoutSetId4',
      tasks: ['CustomReceipt'],
    },
  ],
};

const defaultDataTypes: DataTypeElement[] = [
  { id: 'test1', taskId: 'Task_1' },
  { id: 'test2', taskId: 'Task_1', appLogic: {} },
  { id: 'test3', taskId: 'Task_2' },
  { id: 'test4', taskId: 'Task_3' },
  { id: 'test5', taskId: 'Task_3' },
  { id: reservedDataTypes.refDataAsPdf },
];

const defaultComponent: FormAttachmentListComponent = {
  id: '1',
  type: ComponentType.AttachmentList,
  itemType: 'COMPONENT',
};

const handleComponentChange = jest.fn();

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render spinner when appMetadata is pending', () => {
    render({}, undefined, defaultLayoutSets, defaultDataTypes, false);

    const spinnerText = screen.getByText(textMock('ux_editor.component_properties.loading'));
    expect(spinnerText).toBeInTheDocument();
  });

  it('should render AttachmentList component', async () => {
    await render();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
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

    const includePdfCheckbox = screen.getByRole('checkbox', {
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
      screen.queryByRole('checkbox', {
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

    const currentTaskCheckbox = screen.getByRole('checkbox', {
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

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });

    await user.click(currentTaskCheckbox);
    expect(currentTaskCheckbox).toBeChecked();

    expect(handleComponentChange).not.toHaveBeenCalled();
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
