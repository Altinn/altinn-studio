import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCodeViewer } from './StudioCodeViewer';
import type { StudioCodeViewerProps } from './StudioCodeViewer';
import { MAX_HIGHLIGHT_LENGTH } from './codeLanguage';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const title = 'App/config/applicationmetadata.json';

const defaultProps: StudioCodeViewerProps = {
  code: 'first line\nsecond line',
  title,
  texts: { collapse: 'Collapse', expand: 'Expand' },
};

describe('StudioCodeViewer', () => {
  it('appends custom attributes to the root element', () => {
    testCustomAttributes(renderStudioCodeViewer);
  });

  it('appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioCodeViewer({ className }));
  });

  it('forwards the ref object to the root element', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderStudioCodeViewer({}, ref));
  });

  it('renders the title as the label of the code region', () => {
    renderStudioCodeViewer();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(getCodeRegion()).toBeInTheDocument();
  });

  it('renders each line of the code with its line number', () => {
    renderStudioCodeViewer({ code: 'first\r\nsecond\nthird\n' });
    expect(getCodeRegion()).toHaveTextContent(/^1first2second3third$/);
  });

  it('highlights the code when a language is given', () => {
    renderStudioCodeViewer({ code: 'const a = 1;', language: 'javascript' });
    expect(screen.getByText('const')).toHaveClass('hljs-keyword');
  });

  it('does not highlight the code when no language is given', () => {
    renderStudioCodeViewer({ code: 'const a = 1;' });
    expect(screen.getByText('const a = 1;').tagName).toBe('CODE');
  });

  it('escapes markup in the highlighted code', () => {
    const code = '<script>alert("test")</script>';
    renderStudioCodeViewer({ code, language: 'markdown' });
    expect(getCodeRegion()).toHaveTextContent(code);
    expect(getCodeRegion().innerHTML).not.toContain('<script>');
  });

  it('does not highlight code that is longer than the limit', () => {
    const code = 'const'.padEnd(MAX_HIGHLIGHT_LENGTH + 1, ' ');
    renderStudioCodeViewer({ code, language: 'javascript' });
    expect(screen.getByText('const').tagName).toBe('CODE');
  });

  it('indents valid JSON', () => {
    renderStudioCodeViewer({ code: '{"id":"app"}', language: 'json' });
    expect(getCodeRegion()).toHaveTextContent('1{2  "id": "app"3}', { normalizeWhitespace: false });
  });

  it('shows invalid JSON as it is', () => {
    renderStudioCodeViewer({ code: '{"id":"app",}', language: 'json' });
    expect(getCodeRegion()).toHaveTextContent('1{"id":"app",}');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a collapse button for each JSON object and array', () => {
    renderStudioCodeViewer({ code: '{"a":[1],"b":{"c":2},"d":{}}', language: 'json' });
    expect(screen.getAllByRole('button', { name: defaultProps.texts.collapse })).toHaveLength(3);
  });

  it('does not render collapse buttons for other languages', () => {
    renderStudioCodeViewer({ code: 'function a() {\n}', language: 'javascript' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the content of an object when the user collapses it, and shows it again when the user expands it', async () => {
    const user = userEvent.setup();
    renderStudioCodeViewer({ code: '{"title":{"nb":"App"}}', language: 'json' });
    const [, titleButton] = screen.getAllByRole('button', { name: defaultProps.texts.collapse });

    await user.click(titleButton);
    expect(screen.queryByText('"nb"')).not.toBeInTheDocument();
    expect(getCodeRegion()).toHaveTextContent('2  "title": {…}5}', { normalizeWhitespace: false });
    const expandButton = screen.getByRole('button', { name: defaultProps.texts.expand });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(expandButton);
    expect(screen.getByText('"nb"')).toBeInTheDocument();
  });

  it('expands all objects when the code changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderStudioCodeViewer({ code: '{"a":{"b":1}}', language: 'json' });
    await user.click(screen.getAllByRole('button', { name: defaultProps.texts.collapse })[1]);

    rerender(<StudioCodeViewer {...defaultProps} code='{"a":{"b":2}}' language='json' />);
    expect(
      screen.queryByRole('button', { name: defaultProps.texts.expand }),
    ).not.toBeInTheDocument();
  });
});

function getCodeRegion(): HTMLElement {
  return screen.getByRole('region', { name: title });
}

const renderStudioCodeViewer = (
  props: Partial<StudioCodeViewerProps> = {},
  ref?: Ref<HTMLDivElement>,
): RenderResult => render(<StudioCodeViewer {...defaultProps} {...props} ref={ref} />);
