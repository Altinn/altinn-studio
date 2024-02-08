import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormAttachmentListComponent } from '../../../../types/FormComponent';
import type { IGenericEditComponent } from '../../componentConfig';
import { renderHookWithMockStore, renderWithMockStore } from '../../../../testing/mocks';
import { useLayoutSetsQuery } from '../../../../hooks/queries/useLayoutSetsQuery';
import { AttachmentListComponent } from './AttachmentListComponent';
import React from 'react';
import { waitFor, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const org = 'org';
const app = 'app';

const getAppMetadata = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ...queriesMock,
    dataTypes: [
      { id: 'test1', taskId: 'Task_1' },
      { id: 'test2', taskId: 'Task_1', appLogic: 'should not be included' },
      { id: 'test3', taskId: 'Task_2' },
      { id: 'test4', taskId: 'Task_3' },
    ],
  }),
);

const getLayoutSets = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ...queriesMock,
    sets: [
      {
        id: 'layoutSetId1',
        tasks: ['Task_1'],
      },
      {
        id: 'layoutSetId2',
        tasks: ['Task_2'],
      },
      {
        id: 'layoutSetId3',
        tasks: ['Task_3'],
      },
    ],
  }),
);

const component: FormAttachmentListComponent = {
  id: '1',
  type: ComponentType.AttachmentList,
  itemType: 'COMPONENT',
};

const handleComponentChange = jest.fn();

const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSetsQuery(org, app))
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current.isSuccess).toBe(true));
};

const render = async (
  props: Partial<IGenericEditComponent> = {},
  selectedLayoutSet: string = undefined,
) => {
  return renderWithMockStore({}, { getAppMetadata, getLayoutSets }, queryClientMock, {
    selectedLayoutSet,
  })(<AttachmentListComponent {...defaultProps} {...props} />);
};

describe('AttachmentListComponent', () => {
  it('should render a spinner while loading', async () => {
    await render();

    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('should render AttachmentList component', async () => {
    await render();
    await waitForData();

    expect(screen.queryByTestId('studio-spinner-test-id')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: textMock('ux_editor.component_properties.current_task'),
      }),
    ).toBeInTheDocument();
  });

  it('should display "Alle vedlegg (eksl. PDF)" as selected by default if there is no dataTypeIds selected', async () => {
    await render(
      {
        component: {
          ...component,
        },
      },
      'layoutSetId2',
    );
    await waitForData();

    expect(screen.getByText('Alle vedlegg (eksl. PDF)')).toBeInTheDocument();
  });

  it('should display "Alle vedlegg (inkl. PDF)" if include-all shows as selected in dataTypeIds', async () => {
    await render(
      {
        component: {
          ...component,
          dataTypeIds: ['include-all'],
        },
      },
      'layoutSetId3',
    );
    await waitForData();

    expect(screen.getByText('Alle vedlegg (inkl. PDF)')).toBeInTheDocument();
  });

  it('should display some specified datatypes if selected', async () => {
    await render(
      {
        component: {
          ...component,
          dataTypeIds: ['test1', 'test3', 'test4'],
        },
      },
      'layoutSetId3',
    );
    await waitForData();

    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test3')).toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
  });

  it('should remove selected attachments from other tasks if only current task is set to true', async () => {
    await render(
      {
        component: {
          ...component,
          dataTypeIds: ['test1', 'test4'],
        },
      },
      'layoutSetId3',
    );
    await waitForData();

    const currentTaskCheckbox = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.current_task'),
    });
    expect(screen.getByText('test1')).toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
    await act(() => user.click(currentTaskCheckbox));

    expect(screen.queryByText('test1')).not.toBeInTheDocument();
    expect(screen.getByText('test4')).toBeInTheDocument();
  });

  it('should display all data types when in the last process task, except for data type with appLogic', async () => {
    await render({}, 'layoutSetId3');
    await waitForData();
    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));
    expect(screen.getByRole('option', { name: 'Alle vedlegg (inkl. PDF)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alle vedlegg (eksl. PDF)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test1' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'test2' })).not.toBeInTheDocument(); // because data types with appLogic should not be included
    expect(screen.getByRole('option', { name: 'test3' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'test4' })).toBeInTheDocument();
  });

  it('should update component when changing selected data types', async () => {
    await render(
      {
        component: {
          ...component,
          dataTypeIds: ['test1', 'test4'],
        },
      },
      'layoutSetId3',
    );
    await waitForData();

    const dropdown = screen.getByRole('combobox');
    await act(() => user.click(dropdown));
    const option = screen.getByRole('option', { name: 'test3' });
    await act(() => user.click(option));

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...component,
      dataTypeIds: ['test1', 'test4', 'test3'],
    });
  });
});
