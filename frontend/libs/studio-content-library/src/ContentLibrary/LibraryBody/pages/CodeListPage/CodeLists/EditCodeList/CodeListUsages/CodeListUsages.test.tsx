import { render, screen } from '@testing-library/react';
import type { CodeListUsagesProps } from './CodeListUsages';
import { CodeListUsages } from './CodeListUsages';
import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { UsageBpmnTaskType } from '../../../types/UsageBpmnTaskType';

const taskType = UsageBpmnTaskType.Data;
const taskName = 'taskName';
const layoutName = 'layoutName';
const componentId = 'componentId';
const componentIds = [componentId];

describe('CodeListUsages', () => {
  it('renders table with column titles', () => {
    renderCodeListUsages();
    const taskTypeColumnTitle = screen.getByRole('columnheader', {
      name: textMock(
        'app_content_library.code_lists.code_list_usage_table_column_header_task_type',
      ),
    });
    expect(taskTypeColumnTitle).toBeInTheDocument();
    const taskNameColumnTitle = screen.getByRole('columnheader', {
      name: textMock(
        'app_content_library.code_lists.code_list_usage_table_column_header_task_name',
      ),
    });
    expect(taskNameColumnTitle).toBeInTheDocument();
    const layoutColumnTitle = screen.getByRole('columnheader', {
      name: textMock('app_content_library.code_lists.code_list_usage_table_column_header_layout'),
    });
    expect(layoutColumnTitle).toBeInTheDocument();
    const componentIdsColumnTitle = screen.getByRole('columnheader', {
      name: textMock(
        'app_content_library.code_lists.code_list_usage_table_column_header_components',
      ),
    });
    expect(componentIdsColumnTitle).toBeInTheDocument();
  });

  it('renders a row with the code list usage source', () => {
    renderCodeListUsages();
    const codeListSourceTaskType = screen.getByRole('cell', {
      name: textMock('app_content_library.code_lists.code_list_usage_table_task_type_data'),
    });
    expect(codeListSourceTaskType).toBeInTheDocument();
    const codeListSourceTaskName = screen.getByRole('cell', { name: taskName });
    expect(codeListSourceTaskName).toBeInTheDocument();
    const codeListSourceLayout = screen.getByRole('cell', { name: layoutName });
    expect(codeListSourceLayout).toBeInTheDocument();
    const codeListSourceComponentIds = screen.getByRole('cell', { name: componentId });
    expect(codeListSourceComponentIds).toBeInTheDocument();
  });

  it('renders a row with the code list usage sources with multiple component ids', () => {
    const multipleComponentIds = [componentId, 'componentId2'];
    renderCodeListUsages({
      codeListSources: [{ taskType, taskName, layoutName, componentIds: multipleComponentIds }],
    });
    const codeListSourceTaskType = screen.getByRole('cell', {
      name: textMock('app_content_library.code_lists.code_list_usage_table_task_type_data'),
    });
    expect(codeListSourceTaskType).toBeInTheDocument();
    const codeListSourceTaskName = screen.getByRole('cell', { name: taskName });
    expect(codeListSourceTaskName).toBeInTheDocument();
    const codeListSourceLayout = screen.getByRole('cell', { name: layoutName });
    expect(codeListSourceLayout).toBeInTheDocument();
    const codeListSourceComponentIds = screen.getByRole('cell', {
      name: multipleComponentIds.join(', '),
    });
    expect(codeListSourceComponentIds).toBeInTheDocument();
  });

  it('renders multiple rows with code list usage sources', () => {
    renderCodeListUsages({
      codeListSources: [
        { taskType, taskName, layoutName, componentIds },
        { taskType, taskName, layoutName, componentIds },
      ],
    });
    const codeListSources = screen.getAllByRole('row');
    expect(codeListSources).toHaveLength(3); // Including header row
  });
});

const defaultCodeListUsagesProps: CodeListUsagesProps = {
  codeListSources: [{ taskType, taskName, layoutName, componentIds }],
};

const renderCodeListUsages = (props: Partial<CodeListUsagesProps> = {}) => {
  render(<CodeListUsages {...defaultCodeListUsagesProps} {...props} />);
};
