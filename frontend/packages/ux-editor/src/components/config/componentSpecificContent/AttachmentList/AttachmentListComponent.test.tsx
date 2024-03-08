import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAttachmentListComponent } from '../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore } from '../../../../testing/mocks';
import { AttachmentListComponent } from './AttachmentListComponent';
import React from 'react';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { reservedDataTypes } from './AttachmentListUtils';

const user = userEvent.setup();
const org = 'org';
const app = 'app';

const defaultLayoutSets: LayoutSets = {
  sets: [
    {
      id: 'layoutSetId1',
      dataTypes: 'layoutSetId1',
      tasks: ['Task_1'],
    },
    {
      id: 'layoutSetId2',
      dataTypes: 'layoutSetId2',
      tasks: ['Task_2'],
    },
    {
      id: 'layoutSetId3',
      dataTypes: 'layoutSetId3',
      tasks: ['Task_3'],
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
  selectedLayoutSet: string = undefined,
  layoutSets: LayoutSets = defaultLayoutSets,
  dataTypes: DataTypeElement[] = defaultDataTypes,
) => {
  const client = createQueryClientMock();
  client.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);
  client.setQueryData([QueryKey.AppMetadata, org, app], { dataTypes });
  return renderWithMockStore({}, {}, client, {
    selectedLayoutSet,
  })(<AttachmentListComponent {...defaultProps} {...props} />);
};

describe('AttachmentListComponent', () => {
  it('should render AttachmentList component', async () => {
    await render();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.current_task'),
      }),
    ).toBeInTheDocument();
  });

  [
    undefined,
    [],
    [reservedDataTypes.includeAll],
    [reservedDataTypes.currentTask],
    ['test1', 'test3', 'test4', 'test5'],
    ['test1', 'test3', 'test4', 'test5', reservedDataTypes.refDataAsPdf],
  ].forEach((dataTypeIds) => {
    it(`checks "Select All Attachments" checkbox when selected dataTypeIds are "${dataTypeIds}"`, async () => {
      await render(
        {
          component: {
            ...defaultComponent,
            dataTypeIds,
          },
        },
        'layoutSetId3',
      );

      const checkbox = screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.select_all_attachments'),
      });
      expect(checkbox).toBeChecked();
      if (dataTypeIds === undefined || !dataTypeIds.includes(reservedDataTypes.currentTask)) {
        expect(screen.getByText('test1')).toBeInTheDocument();
        expect(screen.getByText('test3')).toBeInTheDocument();
      }
      expect(screen.getByText('test4')).toBeInTheDocument();
    });
  });

  it('should display some specified datatypes if selected', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test3'],
        },
      },
      'layoutSetId2',
    );

    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test3')).toBeInTheDocument();
  });

  it('should remove selected attachments from other tasks if "only current task" is set to true', async () => {
    handleComponentChange.mockClear();
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test3', 'test4'],
        },
      },
      'layoutSetId3',
    );

    // TODO: there is an issue where the combobox triggers onChangeValue when rendered and the initial selected value is not [].
    // This is a workaround, I have created an issue in the designsystem: https://github.com/digdir/designsystemet/issues/1640
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    handleComponentChange.mockClear();

    expect(screen.getByText('test3')).toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });

    await act(() => user.click(currentTaskCheckbox));
    expect(currentTaskCheckbox).toBeChecked();

    expect(handleComponentChange).toHaveBeenNthCalledWith(1, {
      ...defaultComponent,
      dataTypeIds: ['test4', 'current-task'],
    });
    expect(handleComponentChange).toHaveBeenCalledTimes(2);
    expect(handleComponentChange).toHaveBeenNthCalledWith(2, {
      ...defaultComponent,
      dataTypeIds: ['test4', 'current-task'],
    });
    expect(screen.queryByText('test3')).not.toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
  });

  it('should include pdf if the switch is set to true', async () => {
    handleComponentChange.mockClear();
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test3', 'test4'],
        },
      },
      'layoutSetId3',
    );
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    handleComponentChange.mockClear();
    const includePdfCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.select_pdf'),
    });

    await act(() => user.click(includePdfCheckbox));
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test3', 'test4', reservedDataTypes.refDataAsPdf],
    });
  });

  it('should display all data types when in the last process task, except for data type with appLogic', async () => {
    await render({}, 'layoutSetId3');

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));

    expect(screen.getByRole('option', { name: 'test1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test3' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test4' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test5' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'test2' })).not.toBeInTheDocument();
  });

  it('should update component when changing selected data types', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test4'],
        },
      },
      'layoutSetId3',
    );

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));
    const option = screen.getByRole('option', { name: 'test3' });
    await act(() => user.click(option));
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test1', 'test4', 'test3'],
    });
  });

  it("should display current task as checked when component contains 'current-task'", async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['current-task'],
        },
      },
      'layoutSetId3',
    );
    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });
    expect(currentTaskCheckbox).toBeChecked();
  });

  it("should display include pdfs as checked when component contains 'ref-data-as-pdf'", async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: [reservedDataTypes.refDataAsPdf],
        },
      },
      'layoutSetId3',
    );
    const includePdfCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.select_pdf'),
    });
    expect(includePdfCheckbox).toBeChecked();
  });

  it('should update component when unchecking pdf', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: [reservedDataTypes.refDataAsPdf, 'test1'],
        },
      },
      'layoutSetId3',
    );

    const includePdfCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.select_pdf'),
    });
    await act(() => user.click(includePdfCheckbox));

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test1'],
    });
  });

  it('should update component when unchecking current task', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['current-task', 'test4'],
        },
      },
      'layoutSetId3',
    );

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });
    await act(() => user.click(currentTaskCheckbox));

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test4'],
    });
  });

  //This test only secure that studio doesn't crash when there is no layoutSets
  // In v4 there shouldn't be a case with apps with no layoutSets
  it('should render AttachmentList component even when there are no layout sets and data types', async () => {
    await render({}, undefined, null, undefined);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.current_task'),
      }),
    ).toBeInTheDocument();
  });
});
