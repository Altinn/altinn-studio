import React from 'react';

import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

import { AttachmentGroupings } from 'src/components/organisms/AttachmentGroupings';
import type { IDisplayAttachment } from 'src/types/shared';

const mockAttachments: IDisplayAttachment[] = [
  {
    name: 'file1.pdf',
    url: 'https://example.com/file1.pdf',
    grouping: 'Documents',
    description: { nb: 'Beskrivelse 1' },
  },
  {
    name: 'file2.docx',
    url: 'https://example.com/file2.docx',
    grouping: 'Documents',
    description: { nb: 'Beskrivelse 2' },
  },
  {
    name: 'image1.jpg',
    url: 'https://example.com/image1.jpg',
    grouping: 'Images',
    description: { nb: 'Bilde 1' },
  },
  {
    name: 'file3.txt',
    url: 'https://example.com/file3.txt',
    grouping: undefined, // No grouping
    description: { nb: 'Fil uten gruppering' },
  },
] as unknown as IDisplayAttachment[];

// Mock the AltinnCollapsibleAttachments component
jest.mock('src/components/molecules/AltinnCollapsibleAttachments', () => ({
  AltinnCollapsibleAttachments: jest.fn(({ attachments, title }) => (
    <div data-testid='collapsible-attachments'>
      <div data-testid='collapsible-title'>{title}</div>
      <div data-testid='attachment-count'>{attachments?.length || 0}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {attachments?.map((attachment: any, index: number) => (
        <div
          key={index}
          data-testid='attachment-item'
        >
          {attachment.name}
        </div>
      ))}
    </div>
  )),
}));

// Mock the language hook
jest.mock('src/features/language/useLanguage', () => ({
  useLanguage: jest.fn(() => ({
    langAsString: jest.fn((key) => key),
  })),
}));

// Mock CSS modules
jest.mock('src/components/organisms/AttachmentGroupings.module.css', () => ({
  groupList: 'group-list',
  paddingBottom: 'padding-bottom',
}));

describe('AttachmentGroupings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when there are no attachments', () => {
    it.each([[], undefined])(
      'displays only the main title when attachments array is empty or undefined',
      (attachments) => {
        render(
          <AttachmentGroupings
            attachments={attachments}
            title={<span>My Documents</span>}
            showLinks={true}
          />,
        );

        expect(screen.getByText('My Documents')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
      },
    );

    it('renders nothing when no attachments and no title', () => {
      const { container } = render(
        <AttachmentGroupings
          attachments={[]}
          title={undefined}
          showLinks={true}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it('hides count when hideCollapsibleCount is true and no attachments', () => {
      render(
        <AttachmentGroupings
          attachments={[]}
          title={<span>Empty List</span>}
          hideCollapsibleCount={true}
          showLinks={true}
        />,
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Empty List');
      expect(heading).not.toHaveTextContent('(0)');
    });
  });

  describe('when there are attachments', () => {
    it('displays all grouped attachments in collapsible sections', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>All Files</span>}
          showLinks={true}
        />,
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getAllByTestId('collapsible-attachments')).toHaveLength(3);
    });

    it('shows correct attachment counts per group', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>All Files</span>}
          showLinks={true}
        />,
      );

      const counts = screen.getAllByTestId('attachment-count');
      expect(counts).toHaveLength(3);

      // Check that counts are correct (order depends on sorting)
      const countValues = counts.map((el) => el.textContent);
      expect(countValues).toContain('1'); // ungrouped
      expect(countValues).toContain('2'); // Documents
      expect(countValues).toContain('1'); // Images
    });

    it('sorts ungrouped attachments first', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>All Files</span>}
          showLinks={true}
        />,
      );

      const listItems = screen.getAllByRole('listitem');
      const firstItem = listItems[0];

      // First item should contain the ungrouped attachment
      expect(firstItem).toContainElement(screen.getByText('file3.txt'));
    });
  });

  describe('title display logic', () => {
    it('displays main title when all attachments have grouping', () => {
      const groupedAttachments = mockAttachments.filter((att) => att.grouping);

      render(
        <AttachmentGroupings
          attachments={groupedAttachments}
          title={<span>Grouped Files</span>}
          showLinks={true}
        />,
      );

      expect(screen.getByText('Grouped Files')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('does not display main title separately when ungrouped attachments exist', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>Mixed Files</span>}
          showLinks={true}
        />,
      );

      // Main title should be within the ungrouped section, not separately
      expect(screen.getByText('Mixed Files')).toBeInTheDocument();

      // Should only have group titles as separate headings
      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(3); // One for each group
    });

    it('shows group names with attachment counts', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>All Files</span>}
          showLinks={true}
        />,
      );

      expect(screen.getByText('Documents (2)')).toBeInTheDocument();
      expect(screen.getByText('Images (1)')).toBeInTheDocument();
    });

    it('hides attachment counts when hideCollapsibleCount is true', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>All Files</span>}
          hideCollapsibleCount={true}
          showLinks={true}
        />,
      );

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.queryByText('Documents (2)')).not.toBeInTheDocument();
      expect(screen.queryByText('Images (1)')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('uses proper list structure', () => {
      render(
        <AttachmentGroupings
          attachments={mockAttachments}
          title={<span>All Files</span>}
          showLinks={true}
        />,
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
  });
});
