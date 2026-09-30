import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioCodeViewer } from './StudioCodeViewer';
import type { StudioCodeViewerProps } from './StudioCodeViewer';
import { MAX_HIGHLIGHT_LENGTH } from './codeLanguage';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const defaultProps: StudioCodeViewerProps = {
  code: '{\n  "name": "App"\n}',
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

  it('renders the code', () => {
    renderStudioCodeViewer();
    expect(getCodeElement()).toHaveTextContent(defaultProps.code, { normalizeWhitespace: false });
  });

  it('renders the title as the label of the code region', () => {
    const title = 'App/config/applicationmetadata.json';
    renderStudioCodeViewer({ title });
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
  });

  it('renders one line number for each line of code', () => {
    const { container } = renderStudioCodeViewer({ code: 'first\nsecond\r\nthird\n' });
    expect(getLineNumbers(container)).toBe('1\n2\n3');
  });

  it('normalizes Windows line breaks', () => {
    renderStudioCodeViewer({ code: 'first\r\nsecond' });
    expect(getCodeElement().textContent).toBe('first\nsecond');
  });

  it('highlights the code when a language is given', () => {
    renderStudioCodeViewer({ language: 'json' });
    expect(screen.getByText('"name"')).toHaveClass('hljs-attr');
  });

  it('does not highlight the code when no language is given', () => {
    renderStudioCodeViewer();
    expect(getCodeElement().innerHTML).toBe(defaultProps.code);
  });

  it('escapes markup in the highlighted code', () => {
    const code = '<script>alert("test")</script>';
    renderStudioCodeViewer({ code, language: 'json' });
    expect(getCodeElement()).toHaveTextContent(code);
    expect(getCodeElement().innerHTML).not.toContain('<script>');
  });

  it('does not highlight code that is longer than the limit', () => {
    const code = '"a"'.padEnd(MAX_HIGHLIGHT_LENGTH + 1, ' ');
    renderStudioCodeViewer({ code, language: 'json' });
    expect(getCodeElement().innerHTML).toBe(code);
  });
});

function getCodeElement(): HTMLElement {
  return document.querySelector('code');
}

function getLineNumbers(container: HTMLElement): string {
  return container.querySelector('pre[aria-hidden]').textContent;
}

const renderStudioCodeViewer = (
  props: Partial<StudioCodeViewerProps> = {},
  ref?: Ref<HTMLDivElement>,
): RenderResult => render(<StudioCodeViewer {...defaultProps} {...props} ref={ref} />);
