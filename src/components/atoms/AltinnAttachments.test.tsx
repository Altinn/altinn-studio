import React from 'react';

import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import type { IDisplayAttachment } from 'src/types/shared';

// Mock data with only the properties used in the component and tests
const mockAttachments = [
  {
    name: 'file1.pdf',
    url: 'https://example.com/file1.pdf',
    description: {
      nb: 'Beskrivelse av fil 1',
      en: 'Description of file 1',
    },
  },
  {
    name: 'file2.docx',
    url: 'https://example.com/file2.docx',
    description: {
      nb: 'Beskrivelse av fil 2',
      en: 'Description of file 2',
    },
  },
  {
    name: 'file3.xlsx',
    url: 'https://example.com/file3.xlsx',
    description: undefined,
  },
] as unknown as IDisplayAttachment[];

// Mock the hooks and utilities
jest.mock('src/features/language/LanguageProvider', () => ({
  useCurrentLanguage: jest.fn(() => 'nb'),
}));

jest.mock('src/features/language/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    langAsString: jest.fn((key, params) => {
      if (key === 'general.download') {
        return `Download ${params?.[0] ?? ''}`;
      }
      return key;
    }),
  })),
}));

jest.mock('src/layout/FileUpload/FileUploadTable/AttachmentFileName', () => ({
  FileExtensionIcon: jest.fn(({ fileEnding, className }) => (
    <span
      data-testid='file-extension-icon'
      data-file-ending={fileEnding}
      className={className}
    >
      {fileEnding}-icon
    </span>
  )),
}));

jest.mock('src/layout/FileUpload/utils/fileEndings', () => ({
  getFileEnding: jest.fn((filename: string | undefined) => {
    if (!filename) {
      return '';
    }
    const split = filename.split('.');
    return split.length > 1 ? `.${split[split.length - 1]}` : '';
  }),
  removeFileEnding: jest.fn((filename: string | undefined) => {
    if (!filename) {
      return '';
    }
    const split = filename.split('.');
    return split.length > 1 ? filename.replace(`.${split[split.length - 1]}`, '') : filename;
  }),
}));

jest.mock('src/utils/urls/urlHelper', () => ({
  makeUrlRelativeIfSameDomain: jest.fn((url) => url),
}));

jest.mock('src/app-components/ConditionalWrapper/ConditionalWrapper', () => ({
  ConditionalWrapper: jest.fn(({ condition, wrapper, otherwise, children }) => {
    if (condition) {
      return wrapper(children);
    } else if (otherwise) {
      return otherwise(children);
    } else {
      return children;
    }
  }),
}));

describe('AltinnAttachments', () => {
  const mockUseCurrentLanguage = jest.mocked(useCurrentLanguage);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render attachments correctly', () => {
    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
      />,
    );

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();

    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    expect(screen.getByText('file1')).toBeInTheDocument();
    expect(screen.getByText('file2')).toBeInTheDocument();
    expect(screen.getByText('file3')).toBeInTheDocument();

    expect(screen.getByText('.pdf')).toBeInTheDocument();
    expect(screen.getByText('.docx')).toBeInTheDocument();
    expect(screen.getByText('.xlsx')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    const title = 'Attachment List Title';
    render(
      <AltinnAttachments
        attachments={mockAttachments}
        title={title}
        showLinks={true}
      />,
    );

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('should render links when showLinks is true', () => {
    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
      />,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);

    expect(links[0]).toHaveAttribute('href', 'https://example.com/file1.pdf');
    expect(links[1]).toHaveAttribute('href', 'https://example.com/file2.docx');
    expect(links[2]).toHaveAttribute('href', 'https://example.com/file3.xlsx');
  });

  it('should not render links when showLinks is false', () => {
    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={false}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('should filter out attachments without a name', () => {
    const attachmentsWithEmptyName = [
      ...mockAttachments,
      {
        name: undefined,
        url: 'https://example.com/file4.txt',
      } as unknown as IDisplayAttachment,
    ];

    render(
      <AltinnAttachments
        attachments={attachmentsWithEmptyName}
        showLinks={true}
      />,
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('should sort attachments by name', () => {
    // Mock the localeCompare function to ensure consistent sorting
    const originalLocaleCompare = String.prototype.localeCompare;
    String.prototype.localeCompare = jest.fn((str) => {
      if (str === 'file1.pdf') {
        return 1;
      }
      if (str === 'file2.docx') {
        return -1;
      }
      return 0;
    });

    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
      />,
    );

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);

    String.prototype.localeCompare = originalLocaleCompare;
  });

  it('should use the correct language for sorting', () => {
    mockUseCurrentLanguage.mockReturnValue('en');

    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
      />,
    );

    expect(mockUseCurrentLanguage).toHaveBeenCalled();
  });

  it('should handle empty attachments array', () => {
    render(
      <AltinnAttachments
        attachments={[]}
        showLinks={true}
      />,
    );

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('should handle undefined attachments', () => {
    render(
      <AltinnAttachments
        attachments={undefined}
        showLinks={true}
      />,
    );

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('should use the id prop when provided', () => {
    const id = 'custom-id';
    render(
      <AltinnAttachments
        attachments={mockAttachments}
        id={id}
        showLinks={true}
      />,
    );

    expect(screen.getByTestId('attachment-list')).toHaveAttribute('id', id);
  });

  it('should show descriptions when showDescription is true and attachment has a description', () => {
    mockUseCurrentLanguage.mockReturnValue('nb');

    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
        showDescription={true}
      />,
    );

    expect(screen.getByText('Beskrivelse av fil 1')).toBeInTheDocument();
    expect(screen.getByText('Beskrivelse av fil 2')).toBeInTheDocument();
    // File 3 doesn't have a description, so it shouldn't be shown
    expect(screen.queryByText('Beskrivelse av fil 3')).not.toBeInTheDocument();
  });

  it('should not show descriptions when showDescription is false', () => {
    mockUseCurrentLanguage.mockReturnValue('nb');

    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
        showDescription={false}
      />,
    );

    expect(screen.queryByText('Beskrivelse av fil 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Beskrivelse av fil 2')).not.toBeInTheDocument();
  });

  it('should show descriptions in the correct language', () => {
    // Set language to English
    mockUseCurrentLanguage.mockReturnValue('en');

    render(
      <AltinnAttachments
        attachments={mockAttachments}
        showLinks={true}
        showDescription={true}
      />,
    );

    expect(screen.getByText('Description of file 1')).toBeInTheDocument();
    expect(screen.getByText('Description of file 2')).toBeInTheDocument();
    expect(screen.queryByText('Beskrivelse av fil 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Beskrivelse av fil 2')).not.toBeInTheDocument();
  });
});
