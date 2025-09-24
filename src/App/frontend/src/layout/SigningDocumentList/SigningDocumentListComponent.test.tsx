import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { randomUUID } from 'crypto';

import { ITextResourceBindings } from 'src/layout/layout';
import { type SigningDocument, useDocumentList } from 'src/layout/SigningDocumentList/api';
import { SigningDocumentListComponent } from 'src/layout/SigningDocumentList/SigningDocumentListComponent';
import { ProcessTaskType } from 'src/types';

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

jest.mock('src/utils/layout/useNodeItem', () => ({}));

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(() => ({
    partyId: 'partyId',
    instanceGuid: randomUUID(),
  })),
}));

jest.mock('src/features/language/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    langAsString: (inputString: string) => inputString,
  })),
}));

jest.mock('src/features/language/Lang', () => ({
  Lang: ({ id }: { id: string }) => id,
}));

jest.mock('src/features/applicationMetadata/ApplicationMetadataProvider', () => ({
  useApplicationMetadata: jest.fn(() => ({
    dataTypes: [],
  })),
}));

jest.mock('src/features/instance/useProcessQuery', () => ({
  useTaskTypeFromBackend: jest.fn(() => ProcessTaskType.Signing),
}));

jest.mock('src/layout/SigningDocumentList/api');

jest.mock('src/layout/SigningDocumentList/SigningDocumentListError', () => ({
  SigningDocumentListError: jest.fn(({ error }: { error: Error }) => error.message),
}));

describe('SigningDocumentList', () => {
  const mockedUseDocumentList = jest.mocked(useDocumentList);

  const textResourceBindings: ITextResourceBindings<'SigningDocumentList'> = {
    title: 'Signing Document List',
    description: 'description',
    help: 'help',
  };

  beforeEach(() => {
    // resets all mocked functions to jest.fn()
    jest.clearAllMocks();

    mockedUseDocumentList.mockReturnValue({
      data: mockDocumentList,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDocumentList>);
  });

  it('should render correctly', () => {
    render(<SigningDocumentListComponent textResourceBindings={textResourceBindings} />);

    screen.getByRole('table', { name: /Signing Document List/ });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_filename' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_attachment_type' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_size' });

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

    render(<SigningDocumentListComponent textResourceBindings={textResourceBindings} />);

    screen.getByText('API error');
  });

  it('should render spinner when loading', () => {
    mockedUseDocumentList.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useDocumentList>);

    render(<SigningDocumentListComponent textResourceBindings={textResourceBindings} />);

    screen.getByRole('table', { name: /Signing Document List/ });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_filename' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_attachment_type' });
    screen.getByRole('columnheader', { name: 'signing_document_list.header_size' });
    screen.getByRole('cell', { name: /loading data.../i });

    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
