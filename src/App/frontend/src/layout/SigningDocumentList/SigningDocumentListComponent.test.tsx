import React from 'react';

import { screen } from '@testing-library/dom';
import { act, render as renderRtl } from '@testing-library/react';

import { apiClients } from 'src/core/api-client';
import { type SigningDocument } from 'src/core/queries/signingDocuments';
import { ITextResourceBindings } from 'src/layout/layout';
import { SigningDocumentListComponent } from 'src/layout/SigningDocumentList/SigningDocumentListComponent';
import { apiMock } from 'src/test/apiMocks';
import { createQueryTestWrapper } from 'src/test/queryTestUtils';

let queryTest: ReturnType<typeof createQueryTestWrapper>;

const randomUUID = () => '00000000-0000-4000-8000-000000000000';

function render(ui: React.ReactNode) {
  return act(async () => renderRtl(ui, { wrapper: queryTest.wrapper }));
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

vi.mock('src/utils/layout/useFormData', () => ({}));

vi.mock('src/utils/layout/DataModelLocation', () => ({
  useIndexedId: (baseId: string) => baseId,
}));

vi.mock('react-router', () => ({
  useParams: vi.fn(() => ({
    instanceOwnerPartyId: 'partyId',
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

vi.mock('src/layout/SigningDocumentList/SigningDocumentListError', () => ({
  SigningDocumentListError: vi.fn(({ error }: { error: Error }) => error.message),
}));

describe('SigningDocumentList', () => {
  const baseComponentId = 'signing-document-list';

  const textResourceBindings: ITextResourceBindings<'SigningDocumentList'> = {
    title: 'Signing Document List',
    description: 'description',
    help: 'help',
  };

  beforeEach(() => {
    // resets all mocked functions to vi.fn()
    vi.clearAllMocks();
    queryTest = createQueryTestWrapper();

    queryTest.apis.signingApi.fetchSigningDocuments.mockResolvedValue(mockDocumentList);
  });

  it('should render correctly', async () => {
    await render(
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

    await screen.findByRole('row', { name: /filename1 attachmentType1 977 KB signing_document_list.download/i });
    expect(screen.getAllByRole('row')).toHaveLength(3);

    screen.getByRole('row', { name: /filename1 attachmentType1 977 KB signing_document_list.download/i });
    screen.getByRole('row', { name: /filename2 attachmenttype2 2 mb signing_document_list.download/i });
  });

  it('should render error message when API call fails', async () => {
    queryTest.apis.signingApi.fetchSigningDocuments.mockRejectedValue(new Error('API error'));

    await render(
      <SigningDocumentListComponent
        baseComponentId={baseComponentId}
        textResourceBindings={textResourceBindings}
      />,
    );

    await screen.findByText('API error');
  });

  it('should render spinner when loading', async () => {
    queryTest.apis.signingApi.fetchSigningDocuments.mockImplementation(
      apiMock(apiClients.signingApi.fetchSigningDocuments),
    );

    await render(
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
