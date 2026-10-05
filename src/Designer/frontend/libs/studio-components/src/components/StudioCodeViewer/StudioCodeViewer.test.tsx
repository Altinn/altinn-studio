import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadHighlightCode, StudioCodeViewer } from './StudioCodeViewer';
import type { StudioCodeViewerProps } from './StudioCodeViewer';
import { MAX_FORMATTED_CODE_LENGTH } from './codeLanguage';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const title = 'App/config/applicationmetadata.json';
const jsonWithThreeFolds = JSON.stringify({ a: [1], b: { c: 2 }, d: {} }, null, 2);

const defaultProps: StudioCodeViewerProps = {
  code: 'first line\nsecond line',
  title,
  texts: { collapse: 'Collapse', expand: 'Expand' },
};

describe('StudioCodeViewer before the highlighter is loaded', () => {
  it('shows the code without colors, and then loads the colors', async () => {
    renderStudioCodeViewer({ code: 'const a = 1;', language: 'javascript' });
    expect(screen.getByText('const a = 1;').tagName).toBe('CODE');
    expect(await screen.findByText('const')).toHaveClass('hljs-keyword');
  });
});

describe('StudioCodeViewer', () => {
  beforeAll(loadHighlightCode);

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

  it('renders each line of the code with the same line number as in an editor', () => {
    renderStudioCodeViewer({ code: 'first\r\nsecond\rthird\n' });
    expect(getCodeRegion()).toHaveTextContent(/^1first2second3third4$/);
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

  it('shows code that is longer than the limit as plain text without colors and folds', () => {
    const code = jsonWithThreeFolds.padEnd(MAX_FORMATTED_CODE_LENGTH + 1, ' ');
    renderStudioCodeViewer({ code, language: 'json' });
    expect(getCodeRegion()).toHaveTextContent(/^1 2 3 4 5 6 7 8 9\{ "a": \[/);
    expect(screen.getByText(/"a": \[/).tagName).toBe('CODE');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows JSON as it is in the file', () => {
    renderStudioCodeViewer({ code: '{"id":"app"}', language: 'json' });
    expect(getCodeRegion()).toHaveTextContent(/^1{"id":"app"}$/);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a collapse button for each JSON object and array', () => {
    renderStudioCodeViewer({ code: jsonWithThreeFolds, language: 'json' });
    expect(screen.getAllByRole('button', { name: /^Collapse/ })).toHaveLength(3);
  });

  it('gives each collapse button a name with the code of its line', () => {
    renderStudioCodeViewer({ code: jsonWithThreeFolds, language: 'json' });
    const [rootButton, arrayButton, objectButton] = getFoldButtons();
    expect(rootButton).toHaveAccessibleName('Collapse {');
    expect(arrayButton).toHaveAccessibleName(/^Collapse "a"/);
    expect(objectButton).toHaveAccessibleName(/^Collapse "b"/);
  });

  it('puts only the first fold button in the tab order', () => {
    renderStudioCodeViewer({ code: jsonWithThreeFolds, language: 'json' });
    const [rootButton, ...otherButtons] = getFoldButtons();
    expect(rootButton).toHaveAttribute('tabindex', '0');
    otherButtons.forEach((button) => expect(button).toHaveAttribute('tabindex', '-1'));
  });

  it('moves the focus between the fold buttons with the arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    renderStudioCodeViewer({ code: jsonWithThreeFolds, language: 'json' });
    const [rootButton, arrayButton, objectButton] = getFoldButtons();

    await user.tab();
    expect(getCodeRegion()).toHaveFocus();
    await user.tab();
    expect(rootButton).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(arrayButton).toHaveFocus();
    await user.keyboard('{End}');
    expect(objectButton).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(objectButton).toHaveFocus();
    await user.keyboard('{Home}');
    expect(rootButton).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(rootButton).toHaveFocus();
  });

  it('keeps the last focused fold button in the tab order', async () => {
    const user = userEvent.setup();
    renderStudioCodeViewer({ code: jsonWithThreeFolds, language: 'json' });
    const [, arrayButton] = getFoldButtons();

    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowDown}');
    await user.tab();
    expect(arrayButton).not.toHaveFocus();
    await user.tab({ shift: true });
    expect(arrayButton).toHaveFocus();
  });

  it('keeps the focus on the fold button when the user collapses it with the keyboard', async () => {
    const user = userEvent.setup();
    renderStudioCodeViewer({ code: jsonWithThreeFolds, language: 'json' });
    const [, arrayButton] = getFoldButtons();

    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(arrayButton).toHaveFocus();
    expect(arrayButton).toHaveAttribute('aria-expanded', 'false');
    expect(arrayButton).toHaveAccessibleName(/^Expand "a"/);
  });

  it('does not render collapse buttons for other languages', () => {
    renderStudioCodeViewer({ code: 'function a() {\n}', language: 'javascript' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the content of an object when the user collapses it, and shows it again when the user expands it', async () => {
    const user = userEvent.setup();
    const code = JSON.stringify({ title: { nb: 'App' } }, null, 2);
    renderStudioCodeViewer({ code, language: 'json' });
    const titleButton = screen.getByRole('button', { name: /^Collapse "title"/ });

    await user.click(titleButton);
    expect(screen.queryByText('"nb"')).not.toBeInTheDocument();
    expect(getCodeRegion()).toHaveTextContent('2  "title": {…}5}', { normalizeWhitespace: false });
    const expandButton = screen.getByRole('button', { name: /^Expand "title"/ });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(expandButton);
    expect(screen.getByText('"nb"')).toBeInTheDocument();
  });

  it('expands all objects when the code changes', async () => {
    const user = userEvent.setup();
    const code = JSON.stringify({ a: { b: 1 } }, null, 2);
    const { rerender } = renderStudioCodeViewer({ code, language: 'json' });
    await user.click(screen.getByRole('button', { name: /^Collapse "a"/ }));

    rerender(<StudioCodeViewer {...defaultProps} code={code.replace('1', '2')} language='json' />);
    expect(screen.queryByRole('button', { name: /^Expand/ })).not.toBeInTheDocument();
  });
});

function getFoldButtons(): HTMLElement[] {
  return screen.getAllByRole('button');
}

function getCodeRegion(): HTMLElement {
  return screen.getByRole('region', { name: title });
}

const renderStudioCodeViewer = (
  props: Partial<StudioCodeViewerProps> = {},
  ref?: Ref<HTMLDivElement>,
): RenderResult => render(<StudioCodeViewer {...defaultProps} {...props} ref={ref} />);
