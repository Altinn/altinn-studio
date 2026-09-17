import React from 'react';

import { render, screen } from '@testing-library/react';

import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { CompExternal } from 'src/layout/layout';
import { DataTypeReference } from 'src/utils/attachmentsUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IData, IDataType } from 'src/types/shared';

const mockDataTypes = [
  {
    id: 'dataType1',
    taskId: 'Task_1',
    grouping: 'group1',
  },
  {
    id: 'dataType2',
    taskId: 'Task_1',
    grouping: 'group2',
  },
  {
    id: 'dataType3',
    taskId: 'Task_2',
    grouping: 'group3',
  },
] as unknown as IDataType[];

const mockInstanceData = [
  {
    id: 'attachment1',
    dataType: 'dataType1',
    filename: 'file1.pdf',
    selfLinks: { apps: 'https://example.com/file1.pdf' },
  },
  {
    id: 'attachment2',
    dataType: 'dataType2',
    filename: 'file2.pdf',
    selfLinks: { apps: 'https://example.com/file2.pdf' },
  },
  {
    id: 'attachment3',
    dataType: 'dataType3',
    filename: 'file3.pdf',
    selfLinks: { apps: 'https://example.com/file3.pdf' },
  },
] as unknown as IData[];

vi.mock('src/utils/layout/hooks');
vi.mock('src/utils/layout/useEvalExpression', () => ({
  useEvalExpression: (value: unknown, descriptor: { defaultValue: unknown }) => value ?? descriptor.defaultValue,
}));

vi.mock('src/utils/layout/useComponentStructureData', () => ({
  useComponentStructureData: vi.fn(() => ({
    componentId: 'attachment-list-1',
    innerGrid: undefined,
    validationGrid: undefined,
    showValidationMessages: false,
  })),
}));

vi.mock('src/features/instance/InstanceContext', () => ({
  useInstanceDataElements: vi.fn(() => mockInstanceData),
}));

vi.mock('src/features/instance/useProcessQuery', () => ({
  useProcessQuery: vi.fn(() => ({
    data: {
      currentTask: {
        elementId: 'Task_1',
      },
    },
  })),
}));

vi.mock('@app/form-component', () => ({
  AttachmentList: vi.fn(({ attachments, title, groupByDataTypeGrouping, showLinks, showDescription, componentId }) => (
    <div data-testid='attachment-list'>
      <div data-testid='attachment-list-component-id'>{componentId}</div>
      <div data-testid='attachment-list-title'>{title}</div>
      <div data-testid='attachment-list-grouped'>{groupByDataTypeGrouping ? 'true' : 'false'}</div>
      <div data-testid='attachment-list-showlinks'>{showLinks ? 'true' : 'false'}</div>
      <div data-testid='attachment-list-showdescription'>{showDescription ? 'true' : 'false'}</div>
      <div data-testid='attachment-list-count'>{attachments?.length ?? 0}</div>
    </div>
  )),
}));

describe('AttachmentListComponent', () => {
  const mockUseComponentConfig = vi.mocked(useComponentConfig<'AttachmentList'>);
  const mockUseInstanceDataElements = vi.mocked(useInstanceDataElements);

  const setupMockComponentConfig = ({
    groupByDataTypeGrouping = false,
    textResourceBindings = { title: 'test-title' },
    links = true,
    dataTypeIds = ['dataType1', 'dataType2', 'dataType3'],
    showDataTypeDescriptions = false,
  } = {}) => {
    mockUseComponentConfig.mockImplementation(
      (_baseId) =>
        ({
          groupByDataTypeGrouping,
          textResourceBindings,
          links,
          dataTypeIds,
          showDataTypeDescriptions,
        }) as ExprResolved<CompExternal<'AttachmentList'>>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockComponentConfig();

    window.altinnAppGlobalData.applicationMetadata = {
      ...window.altinnAppGlobalData.applicationMetadata,
      dataTypes: mockDataTypes,
    };
  });

  it('should render AttachmentList with grouping disabled by default', () => {
    setupMockComponentConfig({ groupByDataTypeGrouping: false });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-list-grouped')).toHaveTextContent('false');
  });

  it('should enable grouping when groupByDataTypeGrouping is true', () => {
    setupMockComponentConfig({ groupByDataTypeGrouping: true });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-grouped')).toHaveTextContent('true');
  });

  it('should pass title and showLinks props', () => {
    setupMockComponentConfig({
      textResourceBindings: { title: 'custom-title' },
      links: true,
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-title')).toHaveTextContent('custom-title');
    expect(screen.getByTestId('attachment-list-showlinks')).toHaveTextContent('true');
  });

  it('should filter attachments based on dataTypeIds when allowedAttachmentTypes is set', () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: ['dataType1'],
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('1');
  });

  it('should include all attachments when dataTypeIds includes IncludeAll', () => {
    mockUseInstanceDataElements.mockReturnValueOnce([
      ...mockInstanceData,
      {
        id: 'attachment4',
        dataType: DataTypeReference.RefDataAsPdf,
        filename: 'file4.pdf',
        selfLinks: { apps: 'https://example.com/file4.pdf' },
      } as unknown as IData,
    ]);

    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.IncludeAll],
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('4');
  });

  it('should include PDF attachments when dataTypeIds includes RefDataAsPdf', () => {
    mockUseInstanceDataElements.mockReturnValueOnce([
      ...mockInstanceData,
      {
        id: 'attachment4',
        dataType: DataTypeReference.RefDataAsPdf,
        filename: 'file4.pdf',
        selfLinks: { apps: 'https://example.com/file4.pdf' },
      } as unknown as IData,
    ]);

    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.RefDataAsPdf],
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('1');
  });

  it('should pass all attachments when grouping is enabled', () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: true,
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('3');
  });

  it('should include only attachments from current task when dataTypeIds includes FromTask', () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.FromTask],
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('2');
  });

  it('should pass showDescription=false by default', () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-showdescription')).toHaveTextContent('false');
  });

  it('should pass showDescription=true when showDataTypeDescriptions is true', () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      showDataTypeDescriptions: true,
    });

    render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-showdescription')).toHaveTextContent('true');
  });
});
