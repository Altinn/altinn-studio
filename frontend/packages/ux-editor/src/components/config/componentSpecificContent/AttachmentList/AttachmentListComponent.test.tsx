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
  { id: 'ref-data-as-pdf' },
];

const defaultComponent: FormAttachmentListComponent = {
  id: '1',
  type: ComponentType.AttachmentList,
  itemType: 'COMPONENT',
  dataTypeIds: [],
};

const handleComponentChange = jest.fn();

const defaultProps: IGenericEditComponent = {
  component: defaultComponent,
  handleComponentChange,
};

const render = async (
  props: Partial<IGenericEditComponent> = {},
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

  it('should display "Alle vedlegg (eksl. PDF)" as selected by default if there is no dataTypeIds selected', async () => {
    await render();
    expect(screen.getByText('Alle vedlegg (eksl. PDF)')).toBeInTheDocument();
  });

  it('should display "Alle vedlegg (inkl. PDF)" if include-all shows as selected in dataTypeIds', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['include-all'],
        },
      },
      'layoutSetId3',
    );

    expect(screen.getByText('Alle vedlegg (inkl. PDF)')).toBeInTheDocument();
  });

  it('should display some specified datatypes if selected', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test3', 'test4'],
        },
      },
      'layoutSetId3',
    );

    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test3')).toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
  });

  it('should unselect other data types when "Alle vedlegg (inkl. PDF)" is selected', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test3', 'test4'],
        },
      },
      'layoutSetId3',
    );

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));
    const option = screen.getByRole('option', { name: 'Alle vedlegg (inkl. PDF)' });
    await act(() => user.click(option));

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['include-all'],
    });
  });

  it('should unselect other data types when "Alle vedlegg (eksl. PDF)" is selected', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test3', 'test4'],
        },
      },
      'layoutSetId3',
    );

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));
    const option = screen.getByRole('option', { name: 'Alle vedlegg (eksl. PDF)' });
    await act(() => user.click(option));

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: [],
    });
  });

  it('should remove selected attachments from other tasks if only current task is set to true', async () => {
    await render(
      {
        component: {
          ...defaultComponent,
          dataTypeIds: ['test1', 'test4'],
        },
      },
      'layoutSetId3',
    );

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });
    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
    await act(() => user.click(currentTaskCheckbox));

    expect(screen.queryByText('test1')).not.toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
  });

  it('should display only data types from current task when switch is checked', async () => {
    await render({}, 'layoutSetId3');

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });
    await act(() => user.click(currentTaskCheckbox));
    expect(currentTaskCheckbox).toBeChecked();

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));
    expect(screen.queryByText('test1')).not.toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
  });

  it('should display all data types when in the last process task, except for data type with appLogic', async () => {
    await render({}, 'layoutSetId3');

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));

    expect(screen.getByRole('option', { name: 'Alle vedlegg (inkl. PDF)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alle vedlegg (eksl. PDF)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Generert PDF' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test3' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test4' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'test2' })).not.toBeInTheDocument(); // because data types with appLogic should not be included
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

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...defaultComponent,
      dataTypeIds: ['test1', 'test4', 'test3'],
    });
  });

  //This test only secure that studio doesn't crash when there is no layoutSets
  // In v4 there shouldn't be a case with apps with no layoutSets
  it('should render AttachmentList component when there is no layoutSets', async () => {
    await render({}, undefined, null);

    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });
    expect(currentTaskCheckbox).toBeInTheDocument();

    await act(() => user.click(dropdown));
    expect(screen.getByRole('option', { name: 'Alle vedlegg (inkl. PDF)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alle vedlegg (eksl. PDF)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Generert PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'test1' })).not.toBeInTheDocument();
  });
});
