import { SourceList, type SourceListProps } from './SourceList';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { Source } from '../../../../../types/ChatThread';

const sourceTitle = 'Cited doc';
const safeUrl = 'https://example.com/doc';

const createSource = (overrides: Partial<Source> = {}): Source => ({
  tool: 'search',
  title: sourceTitle,
  ...overrides,
});

describe('SourceList', () => {
  it('renders a cited source as a link when the source URL is safe', () => {
    renderSourceList({ sources: [createSource({ url: safeUrl, cited: true })] });

    const link = screen.getByRole('link', { name: new RegExp(sourceTitle) });
    expect(link).toHaveAttribute('href', safeUrl);
  });

  it('renders the source title without a link when the source URL is unsafe', () => {
    renderSourceList({ sources: [createSource({ url: 'javascript:alert(1)', cited: true })] });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(sourceTitle))).toBeInTheDocument();
  });

  it('renders uncited sources in a separate section', () => {
    const uncitedTitle = 'Available doc';
    renderSourceList({
      sources: [createSource({ cited: true }), createSource({ title: uncitedTitle, cited: false })],
    });

    expect(screen.getByText('📚 Kilder brukt')).toBeInTheDocument();
    expect(screen.getByText('📖 Tilgjengelige kilder')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(uncitedTitle))).toBeInTheDocument();
  });
});

const defaultProps: SourceListProps = {
  sources: [createSource()],
};

const renderSourceList = (props: Partial<SourceListProps> = {}): RenderResult =>
  render(<SourceList {...defaultProps} {...props} />);
