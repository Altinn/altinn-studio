import React from 'react';

import { act, render as rtlRender, screen } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { ensureInstanceData } from 'src/core/queries/instance';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { CompExternal } from 'src/layout/layout';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';
import { DataTypeReference } from 'src/utils/attachmentsUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IData, IDataType } from 'src/types/shared';

let instanceData: IData[];

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
  useEvalOptionalText: (value: unknown, descriptor: { defaultValue: unknown }) =>
    value === undefined ? undefined : (value ?? descriptor.defaultValue),
}));

vi.mock('src/utils/layout/useComponentStructureData', () => ({
  useComponentStructureData: vi.fn(() => ({
    componentId: 'attachment-list-1',
    innerGrid: undefined,
    validationGrid: undefined,
    showValidationMessages: false,
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
    instanceData = mockInstanceData;
    setupMockComponentConfig();

    window.altinnAppGlobalData.applicationMetadata = {
      ...window.altinnAppGlobalData.applicationMetadata,
      dataTypes: mockDataTypes,
    };
  });

  it('should render AttachmentList with grouping disabled by default', async () => {
    setupMockComponentConfig({ groupByDataTypeGrouping: false });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-list-grouped')).toHaveTextContent('false');
  });

  it('should enable grouping when groupByDataTypeGrouping is true', async () => {
    setupMockComponentConfig({ groupByDataTypeGrouping: true });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-grouped')).toHaveTextContent('true');
  });

  it('should pass title and showLinks props', async () => {
    setupMockComponentConfig({
      textResourceBindings: { title: 'custom-title' },
      links: true,
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-title')).toHaveTextContent('custom-title');
    expect(screen.getByTestId('attachment-list-showlinks')).toHaveTextContent('true');
  });

  it('should filter attachments based on dataTypeIds when allowedAttachmentTypes is set', async () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: ['dataType1'],
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('1');
  });

  it('should include all attachments when dataTypeIds includes IncludeAll', async () => {
    instanceData = [
      ...mockInstanceData,
      {
        id: 'attachment4',
        dataType: DataTypeReference.RefDataAsPdf,
        filename: 'file4.pdf',
        selfLinks: { apps: 'https://example.com/file4.pdf' },
      } as unknown as IData,
    ];

    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.IncludeAll],
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('4');
  });

  it('should include PDF attachments when dataTypeIds includes RefDataAsPdf', async () => {
    instanceData = [
      ...mockInstanceData,
      {
        id: 'attachment4',
        dataType: DataTypeReference.RefDataAsPdf,
        filename: 'file4.pdf',
        selfLinks: { apps: 'https://example.com/file4.pdf' },
      } as unknown as IData,
    ];

    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.RefDataAsPdf],
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('1');
  });

  it('should pass all attachments when grouping is enabled', async () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: true,
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('3');
  });

  it('should include only attachments from current task when dataTypeIds includes FromTask', async () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      dataTypeIds: [DataTypeReference.FromTask],
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-count')).toHaveTextContent('2');
  });

  it('should pass showDescription=false by default', async () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-showdescription')).toHaveTextContent('false');
  });

  it('should pass showDescription=true when showDataTypeDescriptions is true', async () => {
    setupMockComponentConfig({
      groupByDataTypeGrouping: false,
      showDataTypeDescriptions: true,
    });

    await render(
      <AttachmentListComponent
        baseComponentId='whatever'
        containerDivRef={React.createRef<HTMLDivElement>()}
      />,
    );

    expect(screen.getByTestId('attachment-list-showdescription')).toHaveTextContent('true');
  });
});

async function render(ui: React.ReactNode) {
  const { wrapper, queryClient, apis } = createQueryTestWrapper(
    { instanceApi: { getInstance: async () => ({ ...getInstanceWithProcessMock(), data: instanceData }) } },
    '/instance/123/instance/Task_1',
  );
  await ensureInstanceData(queryClient, {
    instanceOwnerPartyId: '123',
    instanceGuid: 'instance',
    instanceApi: apis.instanceApi,
  });
  return act(async () => rtlRender(ui, { wrapper }));
}
