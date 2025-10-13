import { render, screen } from '@testing-library/react';
import type { CodeListUsagesProps } from './CodeListUsages';
import { CodeListUsages } from './CodeListUsages';
import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { CodeListUsageTaskType } from '../../../../../../../types/CodeListUsageTaskType';

const taskType = CodeListUsageTaskType.Data;
const taskId = 'taskId';
const layoutName = 'layoutName';
const componentId = 'componentId';
const componentIds = [componentId];

describe('CodeListUsages', () => {
  it('renders table with column titles', () => {
    renderCodeListUsages();
    const taskTypeColumnTitle = getColumnHeader(
      textMock(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_task_type',
      ),
    );
    expect(taskTypeColumnTitle).toBeInTheDocument();

    const taskNameColumnTitle = getColumnHeader(
      textMock(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_task_name',
      ),
    );
    expect(taskNameColumnTitle).toBeInTheDocument();

    const layoutColumnTitle = getColumnHeader(
      textMock(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_layout',
      ),
    );
    expect(layoutColumnTitle).toBeInTheDocument();

    const componentIdsColumnTitle = getColumnHeader(
      textMock(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_column_header_components',
      ),
    );
    expect(componentIdsColumnTitle).toBeInTheDocument();
  });

  it('renders a row with the code list usage source', () => {
    renderCodeListUsages();
    const codeListSourceTaskType = getCell(
      textMock(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_task_type_data',
      ),
    );
    expect(codeListSourceTaskType).toBeInTheDocument();

    const codeListSourceTaskName = getCell(taskId);
    expect(codeListSourceTaskName).toBeInTheDocument();

    const codeListSourceLayout = getCell(layoutName);
    expect(codeListSourceLayout).toBeInTheDocument();

    const codeListSourceComponentIds = getCell(componentId);
    expect(codeListSourceComponentIds).toBeInTheDocument();
  });

  it('renders a row with the code list usage sources with multiple component ids', () => {
    const multipleComponentIds = [componentId, 'componentId2'];
    renderCodeListUsages({
      codeListSources: [{ taskType, taskId, layoutName, componentIds: multipleComponentIds }],
    });

    const codeListSourceTaskType = getCell(
      textMock(
        'app_content_library.code_lists_with_text_resources.code_list_usage_table_task_type_data',
      ),
    );
    expect(codeListSourceTaskType).toBeInTheDocument();

    const codeListSourceTaskName = getCell(taskId);
    expect(codeListSourceTaskName).toBeInTheDocument();

    const codeListSourceLayout = getCell(layoutName);
    expect(codeListSourceLayout).toBeInTheDocument();

    const codeListSourceComponentIds = getCell(multipleComponentIds.join(', '));
    expect(codeListSourceComponentIds).toBeInTheDocument();
  });

  it('renders multiple rows with code list usage sources', () => {
    renderCodeListUsages({
      codeListSources: [
        { taskType, taskId, layoutName, componentIds },
        { taskType, taskId, layoutName, componentIds },
      ],
    });
    const codeListSources = screen.getAllByRole('row');
    expect(codeListSources).toHaveLength(3); // Including header row
  });
});

const defaultCodeListUsagesProps: CodeListUsagesProps = {
  codeListSources: [{ taskType, taskId, layoutName, componentIds }],
};

const renderCodeListUsages = (props: Partial<CodeListUsagesProps> = {}) => {
  render(<CodeListUsages {...defaultCodeListUsagesProps} {...props} />);
};

const getCell = (name: string): HTMLElement => screen.getByRole('cell', { name });
const getColumnHeader = (name: string): HTMLElement => screen.getByRole('columnheader', { name });
