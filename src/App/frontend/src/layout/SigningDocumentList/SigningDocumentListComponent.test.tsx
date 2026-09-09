import React from 'react';

import { screen } from '@testing-library/dom';
import { render as renderRtl } from '@testing-library/react';
const randomUUID = () => '00000000-0000-4000-8000-000000000000';

import { ITextResourceBindings } from 'src/layout/layout';
import { type SigningDocument, useDocumentList } from 'src/layout/SigningDocumentList/api';
import { SigningDocumentListComponent } from 'src/layout/SigningDocumentList/SigningDocumentListComponent';
import { ProcessTaskType } from 'src/types';

function render(ui: React.ReactNode) {
  return renderRtl(ui);
}

const mockDocumentList: SigningDocument[] = [
  {
    attachmentTypes: ['attachmentType1'],
    filename: 'filename1',
    dataType: 'dataType1',
    size: 1000000,
    url: 'url1',
  },
  {
    attachmentTypes: ['attachmentType2'],
    filename: 'filename2',
    dataType: 'dataType2',
    size: 2000000,
    url: 'url2',
  },
];

vi.mock('src/utils/layout/useNodeItem', () => ({}));

vi.mock('src/utils/layout/DataModelLocation', () => ({
  useIndexedId: (baseId: string) => baseId,
}));

vi.mock('react-router', () => ({
  useParams: vi.fn(() => ({
    partyId: 'partyId',
    instanceGuid: randomUUID(),
  })),
}));

vi.mock('src/features/language/useLanguage', () => ({
  useLanguage: vi.fn(() => ({
    langAsString: (inputString: string) => inputString,
  })),
}));

vi.mock('src/features/language/Lang', () => ({
  Lang: ({ id }: { id: string }) => id,
}));

vi.mock('src/features/instance/useProcessQuery', () => ({
  useTaskTypeFromBackend: vi.fn(() => ProcessTaskType.Signing),
}));

vi.mock('src/layout/SigningDocumentList/api');

vi.mock('src/layout/SigningDocumentList/SigningDocumentListError', () => ({
  SigningDocumentListError: vi.fn(({ error }: { error: Error }) => error.message),
}));

describe('SigningDocumentList', () => {
  const mockedUseDocumentList = vi.mocked(useDocumentList);
  const baseComponentId = 'signing-document-list';

  const textResourceBindings: ITextResourceBindings<'SigningDocumentList'> = {
    title: 'Signing Document List',
    description: 'description',
    help: 'help',
  };

  beforeEach(() => {
    // resets all mocked functions to vi.fn()
    vi.clearAllMocks();

    mockedUseDocumentList.mockReturnValue({
      data: mockDocumentList,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDocumentList>);
  });

  it('should render correctly', () => {
    render(
      <SigningDocumentListComponent
        baseComponentId={baseComponentId}
        textResourceBindings={textResourceBindings}
      />,
    );

    screen.getByRole('heading', { name: /Signing Document List/ });
    screen.getByText('description');
    expect(screen.queryByRole('caption')).not.toBeInTheDocument();

    screen.getByRole('table', { name: /Signing Document List/ });
    expect(screen.getByTestId('signing-document-list')).toHaveAttribute('aria-label', 'Signing Document List');
    screen.getByRole('columnheader', { name: 'signing_document_list.header_filename' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_attachment_type' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_size' });
    screen.getByRole('columnheader', { name: 'signing_document_list.download' });

    expect(screen.getAllByRole('columnheader')).toHaveLength(4);

    expect(screen.getAllByRole('row')).toHaveLength(3);

    screen.getByRole('row', { name: /filename1 attachmentType1 977 KB signing_document_list.download/i });
    screen.getByRole('row', { name: /filename2 attachmenttype2 2 mb signing_document_list.download/i });
  });

  it('should render error message when API call fails', () => {
    mockedUseDocumentList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API error'),
    } as unknown as ReturnType<typeof useDocumentList>);

    render(
      <SigningDocumentListComponent
        baseComponentId={baseComponentId}
        textResourceBindings={textResourceBindings}
      />,
    );

    screen.getByText('API error');
  });

  it('should render spinner when loading', () => {
    mockedUseDocumentList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useDocumentList>);

    render(
      <SigningDocumentListComponent
        baseComponentId={baseComponentId}
        textResourceBindings={textResourceBindings}
      />,
    );

    screen.getByRole('heading', { name: /Signing Document List/ });
    screen.getByRole('table', { name: /Signing Document List/ });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_filename' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_attachment_type' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_size' });
    screen.getByRole('cell', { name: /loading data.../i });

    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
