import React from 'react';

import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { CompInternal } from 'src/layout/layout';
import { DataTypeReference } from 'src/utils/attachmentsUtils';
import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { IData, IDataType } from 'src/types/shared';

// Mock application metadata data types with only the properties used in tests
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

// Mock instance data with only the properties used in tests
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
    dataType: 'dataType3', // This data type is from a different task (Task_2)
    filename: 'file3.pdf',
    selfLinks: { apps: 'https://example.com/file3.pdf' },
  },
] as unknown as IData[];

// Mock the hooks and utilities
jest.mock('src/utils/layout/useNodeItem');

jest.mock('src/features/instance/InstanceContext', () => ({
  useLaxInstanceData: jest.fn(() => mockInstanceData),
}));

jest.mock('src/features/instance/ProcessContext', () => ({
  useLaxProcessData: jest.fn(() => ({
    currentTask: {
      elementId: 'Task_1',
    },
  })),
}));

jest.mock('src/features/applicationMetadata/ApplicationMetadataProvider', () => ({
  useApplicationMetadata: jest.fn(() => ({
    dataTypes: mockDataTypes,
  })),
}));

jest.mock('src/features/language/Lang', () => ({
  Lang: ({ id }) => <span data-testid='lang-component'>{id}</span>,
}));

jest.mock('src/layout/ComponentStructureWrapper', () => ({
  ComponentStructureWrapper: ({ children }) => <div data-testid='component-structure-wrapper'>{children}</div>,
}));

// Mock the components that are conditionally rendered
jest.mock('src/components/atoms/AltinnAttachments', () => ({
  AltinnAttachments: jest.fn(({ attachments, title, showLinks, showDescription }) => (
    <div data-testid='altinn-attachments'>
      <div data-testid='altinn-attachments-title'>{title}</div>
      <div data-testid='altinn-attachments-showlinks'>{showLinks ? 'true' : 'false'}</div>
      <div data-testid='altinn-attachments-showdescription'>{showDescription ? 'true' : 'false'}</div>
      <div data-testid='altinn-attachments-count'>{attachments?.length ?? 0}</div>
    </div>
  )),
}));

jest.mock('src/components/organisms/AttachmentGroupings', () => ({
  AttachmentGroupings: jest.fn(
    ({ attachments, collapsibleTitle, hideCollapsibleCount, showLinks, showDescription }) => (
      <div data-testid='attachment-groupings'>
        <div data-testid='attachment-groupings-title'>{collapsibleTitle}</div>
        <div data-testid='attachment-groupings-hidecount'>{hideCollapsibleCount ? 'true' : 'false'}</div>
        <div data-testid='attachment-groupings-showlinks'>{showLinks ? 'true' : 'false'}</div>
        <div data-testid='attachment-groupings-showdescription'>{showDescription ? 'true' : 'false'}</div>
        <div data-testid='attachment-groupings-count'>{attachments?.length ?? 0}</div>
      </div>
    ),
  ),
}));

describe('AttachmentListComponent', () => {
  const mockUseItemWhenType = jest.mocked(useItemWhenType<'AttachmentList'>);
  const mockUseLaxInstanceData = jest.mocked(useLaxInstanceData);

  // Helper function to set up mockUseNodeItem with specific values
  const setupMockUseNodeItem = ({
    groupByDataTypeGrouping = false,
    textResourceBindings = { title: 'test-title' },
    links = true,
    dataTypeIds = ['dataType1', 'dataType2', 'dataType3'],
    showDataTypeDescriptions = false,
  } = {}) => {
    mockUseItemWhenType.mockImplementation(
      (_baseId) =>
        ({
          groupByDataTypeGrouping,
          textResourceBindings,
          links,
          dataTypeIds,
          showDataTypeDescriptions,
        }) as CompInternal<'AttachmentList'>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock implementation
    setupMockUseNodeItem();
  });

  it('should render AltinnAttachments when groupByDataTypeGrouping is false', () => {
    setupMockUseNodeItem({ groupByDataTypeGrouping: false });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('altinn-attachments')).toBeInTheDocument();
    expect(screen.queryByTestId('attachment-groupings')).not.toBeInTheDocument();
  });

  it('should render AttachmentGroupings when groupByDataTypeGrouping is true', () => {
    setupMockUseNodeItem({ groupByDataTypeGrouping: true });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-groupings')).toBeInTheDocument();
    expect(screen.queryByTestId('altinn-attachments')).not.toBeInTheDocument();
  });

  it('should pass the correct props to AttachmentGroupings when groupByDataTypeGrouping is true', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: true,
      textResourceBindings: { title: 'custom-title' },
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-groupings-title')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-groupings-showlinks')).toHaveTextContent('true');
    expect(screen.getByTestId('attachment-groupings-hidecount')).toHaveTextContent('true');
  });

  it('should pass the correct props to AltinnAttachments when groupByDataTypeGrouping is false', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
      textResourceBindings: { title: 'custom-title' },
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('altinn-attachments-title')).toBeInTheDocument();
    expect(screen.getByTestId('altinn-attachments-showlinks')).toHaveTextContent('true');
  });

  it('should filter attachments based on dataTypeIds when allowedAttachmentTypes is set', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
      dataTypeIds: ['dataType1'],
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    // Should only show attachments with dataType1 (1 out of 3 total attachments)
    expect(screen.getByTestId('altinn-attachments-count')).toHaveTextContent('1');
  });

  it('should include all attachments when dataTypeIds includes IncludeAll', () => {
    // Mock the instance data to include a RefDataAsPdf attachment
    mockUseLaxInstanceData.mockReturnValueOnce([
      ...mockInstanceData,
      {
        id: 'attachment4',
        dataType: DataTypeReference.RefDataAsPdf,
        filename: 'file4.pdf',
        selfLinks: { apps: 'https://example.com/file4.pdf' },
      } as unknown as IData,
    ]);

    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.IncludeAll],
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    // Should include all attachments (3 from mockInstanceData + 1 RefDataAsPdf)
    expect(screen.getByTestId('altinn-attachments-count')).toHaveTextContent('4');
  });

  it('should include PDF attachments when dataTypeIds includes RefDataAsPdf', () => {
    // Mock the instance data to include a RefDataAsPdf attachment
    mockUseLaxInstanceData.mockReturnValueOnce([
      ...mockInstanceData,
      {
        id: 'attachment4',
        dataType: DataTypeReference.RefDataAsPdf,
        filename: 'file4.pdf',
        selfLinks: { apps: 'https://example.com/file4.pdf' },
      } as unknown as IData,
    ]);

    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.RefDataAsPdf],
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    // Should include the RefDataAsPdf attachment
    expect(screen.getByTestId('altinn-attachments-count')).toHaveTextContent('1');
  });

  it('should pass attachments with grouping information to AttachmentGroupings', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: true,
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    // Should include all attachments from mockInstanceData (dataType1, dataType2, and dataType3)
    expect(screen.getByTestId('attachment-groupings-count')).toHaveTextContent('3');
  });

  it('should include only attachments from current task when dataTypeIds includes FromTask', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.FromTask], // Only include attachments from current task
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    // Should only include attachments from the current task (dataType1 and dataType2)
    // and exclude the attachment from a different task (dataType3)
    expect(screen.getByTestId('altinn-attachments-count')).toHaveTextContent('2');
  });

  it('should pass showDescription=false to AltinnAttachments by default', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('altinn-attachments-showdescription')).toHaveTextContent('false');
  });

  it('should pass showDescription=true to AltinnAttachments when showDataTypeDescriptions is true', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: false,
      showDataTypeDescriptions: true,
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('altinn-attachments-showdescription')).toHaveTextContent('true');
  });

  it('should pass showDescription=false to AttachmentGroupings by default', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: true,
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-groupings-showdescription')).toHaveTextContent('false');
  });

  it('should pass showDescription=true to AttachmentGroupings when showDataTypeDescriptions is true', () => {
    setupMockUseNodeItem({
      groupByDataTypeGrouping: true,
      showDataTypeDescriptions: true,
    });

    render(
      <AttachmentListComponent
        node={{} as LayoutNode<'AttachmentList'>}
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-groupings-showdescription')).toHaveTextContent('true');
  });
});
