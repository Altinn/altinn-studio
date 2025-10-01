import React from 'react';

import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AltinnCollapsibleAttachments } from 'src/components/molecules/AltinnCollapsibleAttachments';
import type { IDisplayAttachment } from 'src/types/shared';

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
  {
    name: 'file4.txt',
    url: 'https://example.com/file4.txt',
    description: undefined,
  },
  {
    name: 'file5.png',
    url: 'https://example.com/file5.png',
    description: undefined,
  },
] as unknown as IDisplayAttachment[];

// Mock the AltinnAttachments component
jest.mock('src/components/atoms/AltinnAttachments', () => ({
  AltinnAttachments: jest.fn(({ id, title, attachments }) => (
    <div data-testid='attachment-list'>
      {id && <div data-testid='list-id'>{id}</div>}
      {title && <div data-testid='list-title'>{title}</div>}
      {attachments?.map((attachment: IDisplayAttachment, index: number) => (
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

// Mock the AltinnCollapsible component
jest.mock('src/components/AltinnCollapsible', () => ({
  AltinnCollapsible: jest.fn(({ open, children }) => (
    <div
      data-testid='collapsible-content'
      style={{ display: open ? 'block' : 'none' }}
    >
      {children}
    </div>
  )),
}));

// Mock CSS modules
jest.mock('src/components/molecules/AltinnCollapsibleAttachments.module.css', () => ({
  container: 'container',
  transformArrowRight: 'transform-arrow-right',
  transition: 'transition',
}));

describe('AltinnCollapsibleAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  });

  describe('when there are no attachments', () => {
    it('displays attachments list without collapsible functionality', () => {
      render(
        <AltinnCollapsibleAttachments
          attachments={[]}
          title='Test Title'
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
      expect(screen.getByTestId('list-id')).toHaveTextContent('attachment-list');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('displays attachments list when attachments is undefined', () => {
      render(
        <AltinnCollapsibleAttachments
          attachments={undefined}
          title='Test Title'
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('when there are attachments', () => {
    it('displays a collapsible button with the title', () => {
      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('My Attachments')).toBeInTheDocument();
    });

    it('shows attachments by default', () => {
      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByTestId('collapsible-content')).toHaveStyle({ display: 'block' });
      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    });

    it('hides and shows attachments when user clicks the collapse button', async () => {
      const user = userEvent.setup();

      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      const button = screen.getByRole('button');

      // Collapse
      await user.click(button);
      expect(screen.getByTestId('collapsible-content')).toHaveStyle({
        display: 'none',
      });

      // Expand
      await user.click(button);
      expect(screen.getByTestId('collapsible-content')).toHaveStyle({
        display: 'block',
      });
    });

    it('toggles when user presses Enter key', async () => {
      const user = userEvent.setup();

      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      const button = screen.getByRole('button');

      // Initially expanded
      expect(screen.getByTestId('collapsible-content')).toHaveStyle({ display: 'block' });

      // Focus the button and press Enter to collapse
      button.focus();
      await user.keyboard('{Enter}');
      expect(screen.getByTestId('collapsible-content')).toHaveStyle({ display: 'none' });
    });

    it('is keyboard accessible with proper tabindex', () => {
      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('displays all attachment names', () => {
      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.docx')).toBeInTheDocument();
      expect(screen.getByText('file3.xlsx')).toBeInTheDocument();
      expect(screen.getByText('file4.txt')).toBeInTheDocument();
      expect(screen.getByText('file5.png')).toBeInTheDocument();
    });

    it('handles complex title elements', () => {
      const ComplexTitle = () => (
        <div>
          <span>Documents</span>
          <strong> (5)</strong>
        </div>
      );

      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title={<ComplexTitle />}
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('(5)')).toBeInTheDocument();
    });
  });

  describe('when printing', () => {
    it('displays attachments without collapsible functionality', () => {
      // Mock print media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(() => ({
          matches: true,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='Print Title'
          showLinks={true}
          showDescription={false}
        />,
      );

      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
      expect(screen.getByTestId('list-title')).toHaveTextContent('Print Title');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('maintains focus on the button after interaction', async () => {
      const user = userEvent.setup();

      render(
        <AltinnCollapsibleAttachments
          attachments={mockAttachments}
          title='My Attachments'
          showLinks={true}
          showDescription={false}
        />,
      );

      const button = screen.getByRole('button');
      await user.click(button);

      expect(button).toHaveFocus();
    });
  });
});
