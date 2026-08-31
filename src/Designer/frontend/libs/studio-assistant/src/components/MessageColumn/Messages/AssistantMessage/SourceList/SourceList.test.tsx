import { SourceList, type SourceListProps } from './SourceList';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { Source } from '../../../../../types/ChatThread';

const sourcesLabel = 'Kilder:';
const sourceTitle = 'Dynamiske uttrykk';
const safeUrl = 'https://docs.altinn.studio/nb/altinn-studio/reference/logic/expressions/';

const createSource = (overrides: Partial<Source> = {}): Source => ({
  title: sourceTitle,
  ...overrides,
});

describe('SourceList', () => {
  it('renders the label and a source with a safe URL as a link', () => {
    renderSourceList({ sources: [createSource({ url: safeUrl, kind: 'docs' })] });

    expect(screen.getByText(sourcesLabel)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: sourceTitle });
    expect(link).toHaveAttribute('href', safeUrl);
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders a source without a URL as plain text', () => {
    renderSourceList({ sources: [createSource({ kind: 'skill', title: 'altinn-prefill' })] });

    expect(screen.getByText('altinn-prefill')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a source with an unsafe URL as plain text', () => {
    renderSourceList({ sources: [createSource({ url: 'javascript:alert(1)' })] });

    expect(screen.getByText(sourceTitle)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders every source in the list', () => {
    renderSourceList({
      sources: [
        createSource({ title: 'Layout-skjema (Input)', url: safeUrl, kind: 'schema' }),
        createSource({ title: 'altinn-datamodels', kind: 'skill' }),
      ],
    });

    expect(screen.getByText('Layout-skjema (Input)')).toBeInTheDocument();
    expect(screen.getByText('altinn-datamodels')).toBeInTheDocument();
  });

  it('renders legacy persisted sources that only have tool and title', () => {
    renderSourceList({
      sources: [createSource({ tool: 'altinn_planning', cited: true })],
    });

    expect(screen.getByText(sourceTitle)).toBeInTheDocument();
  });
});

const defaultProps: SourceListProps = {
  sources: [],
  label: sourcesLabel,
};

const renderSourceList = (props: Partial<SourceListProps> = {}): RenderResult =>
  render(<SourceList {...defaultProps} {...props} />);
