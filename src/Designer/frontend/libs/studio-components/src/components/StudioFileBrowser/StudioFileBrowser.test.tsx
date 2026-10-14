import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Ref } from 'react';
import { render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioFileBrowser } from './StudioFileBrowser';
import type {
  StudioFileBrowserDirectory,
  StudioFileBrowserProps,
  StudioFileBrowserTexts,
} from './StudioFileBrowser';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const texts: StudioFileBrowserTexts = {
  breadcrumbsLabel: 'Folder path',
  root: 'Root',
  loadingDirectory: 'Loading files',
  emptyDirectory: 'The folder is empty',
  directoryEntryType: 'Folder',
  fileEntryType: 'File',
  loadingFile: 'Loading content',
  noFileSelected: 'Select a file',
  collapseCode: 'Collapse',
  expandCode: 'Expand',
};

const defaultProps: StudioFileBrowserProps = {
  directory: {
    path: 'App/config',
    status: 'loaded',
    entries: [
      { name: 'texts', path: 'App/config/texts', type: 'directory' },
      {
        name: 'applicationmetadata.json',
        path: 'App/config/applicationmetadata.json',
        type: 'file',
      },
    ],
  },
  onOpenDirectory: vi.fn(),
  onOpenFile: vi.fn(),
  texts,
};

const textsDirectory: StudioFileBrowserDirectory = {
  path: 'App/config/texts',
  status: 'loaded',
  entries: [],
};

describe('StudioFileBrowser', () => {
  afterEach(vi.clearAllMocks);

  it('appends custom attributes to the root element', () => {
    testCustomAttributes(renderStudioFileBrowser);
  });

  it('appends given classname to internal classname', () => {
    testRootClassNameAppending((className) => renderStudioFileBrowser({ className }));
  });

  it('forwards the ref object to the root element', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderStudioFileBrowser({}, ref));
  });

  it('renders a breadcrumb for the parent folder and marks the current folder', () => {
    renderStudioFileBrowser();
    expect(screen.getByRole('navigation', { name: texts.breadcrumbsLabel })).toBeInTheDocument();
    expect(getButton('App')).toBeInTheDocument();
    expect(getCurrentFolder('config')).toBeInTheDocument();
  });

  it('does not render breadcrumbs for folders above the parent folder', () => {
    renderStudioFileBrowser({ directory: textsDirectory });
    expect(getButton('config')).toBeInTheDocument();
    expect(getCurrentFolder('texts')).toBeInTheDocument();
    expect(screen.queryByText('App')).not.toBeInTheDocument();
    expect(screen.queryByText(texts.root)).not.toBeInTheDocument();
  });

  it('calls onOpenDirectory with the path of the parent folder when the user clicks its breadcrumb', async () => {
    const user = userEvent.setup();
    renderStudioFileBrowser();
    await user.click(getButton('App'));
    expect(defaultProps.onOpenDirectory).toHaveBeenCalledWith('App');
  });

  it('renders the root as the parent folder of a folder in the root', async () => {
    const user = userEvent.setup();
    renderStudioFileBrowser({ directory: { path: 'App', status: 'loaded', entries: [] } });
    expect(getCurrentFolder('App')).toBeInTheDocument();
    await user.click(getButton(texts.root));
    expect(defaultProps.onOpenDirectory).toHaveBeenCalledWith('');
  });

  it('shows the root as the current folder when the path is empty', () => {
    renderStudioFileBrowser({ directory: { path: '', status: 'loaded', entries: [] } });
    expect(screen.queryByRole('button', { name: texts.root })).not.toBeInTheDocument();
    expect(getCurrentFolder(texts.root)).toBeInTheDocument();
  });

  it('calls onOpenDirectory when the user clicks a folder', async () => {
    const user = userEvent.setup();
    renderStudioFileBrowser();
    await user.click(getButton('texts'));
    expect(defaultProps.onOpenDirectory).toHaveBeenCalledWith('App/config/texts');
    expect(defaultProps.onOpenFile).not.toHaveBeenCalled();
  });

  it('calls onOpenFile when the user clicks a file', async () => {
    const user = userEvent.setup();
    renderStudioFileBrowser();
    await user.click(getButton('applicationmetadata.json'));
    expect(defaultProps.onOpenFile).toHaveBeenCalledWith('App/config/applicationmetadata.json');
    expect(defaultProps.onOpenDirectory).not.toHaveBeenCalled();
  });

  it('tells screen readers if an entry is a folder or a file', () => {
    renderStudioFileBrowser();
    expect(getButton('texts')).toHaveAccessibleDescription(texts.directoryEntryType);
    expect(getButton('applicationmetadata.json')).toHaveAccessibleDescription(texts.fileEntryType);
  });

  it('gives the list of entries the name of the current folder', () => {
    renderStudioFileBrowser();
    expect(screen.getByRole('list', { name: 'config' })).toBeInTheDocument();
  });

  it('moves the focus to the current folder when the user opens a folder', async () => {
    const user = userEvent.setup();
    const { rerender } = renderStudioFileBrowser();
    await user.click(getButton('texts'));
    rerender(<StudioFileBrowser {...defaultProps} directory={textsDirectory} />);
    expect(getCurrentFolder('texts')).toHaveFocus();
  });

  it('moves the focus to the current folder when the user opens the parent folder in the breadcrumbs', async () => {
    const user = userEvent.setup();
    const { rerender } = renderStudioFileBrowser({ directory: textsDirectory });
    await user.click(getButton('config'));
    rerender(<StudioFileBrowser {...defaultProps} />);
    expect(getCurrentFolder('config')).toHaveFocus();
  });

  it('does not move the focus when the folder changes without an action from the user', () => {
    const { rerender } = renderStudioFileBrowser();
    rerender(<StudioFileBrowser {...defaultProps} directory={textsDirectory} />);
    expect(getCurrentFolder('texts')).not.toHaveFocus();
  });

  it('does not move the focus when the user has moved the focus out of the file browser', async () => {
    const user = userEvent.setup();
    const { rerender } = renderStudioFileBrowser();
    const buttonOutside = renderButtonOutside();
    await user.click(getButton('texts'));
    buttonOutside.focus();
    rerender(<StudioFileBrowser {...defaultProps} directory={textsDirectory} />);
    expect(buttonOutside).toHaveFocus();
  });

  it('shows the loading message in a status region while the folder loads', () => {
    renderStudioFileBrowser({ directory: { path: '', status: 'loading' } });
    expect(getStatusMessages()).toContain(texts.loadingDirectory);
  });

  it('shows the error message in an alert when the folder could not load', () => {
    const errorMessage = 'Could not load the files';
    renderStudioFileBrowser({ directory: { path: '', status: 'error', errorMessage } });
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
  });

  it('shows a message in a status region when the folder is empty', () => {
    renderStudioFileBrowser({ directory: { path: '', status: 'loaded', entries: [] } });
    expect(getStatusMessages()).toContain(texts.emptyDirectory);
  });

  it('asks the user to select a file when no file is given', () => {
    renderStudioFileBrowser();
    expect(screen.getByText(texts.noFileSelected)).toBeInTheDocument();
  });

  it('shows the loading message in a status region while the file loads', () => {
    renderStudioFileBrowser({
      file: { path: 'App/config/applicationmetadata.json', status: 'loading' },
    });
    expect(getStatusMessages()).toContain(texts.loadingFile);
  });

  it('shows the error message in an alert when the file could not load', () => {
    const errorMessage = 'Could not load the file';
    renderStudioFileBrowser({
      file: { path: 'App/config/applicationmetadata.json', status: 'error', errorMessage },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
  });

  it('shows the content of the file in the code viewer and marks the file as current', async () => {
    const path = 'App/config/applicationmetadata.json';
    renderStudioFileBrowser({ file: { path, status: 'loaded', content: '{ "id": "ttd/app" }' } });
    const codeRegion = screen.getByRole('region', { name: path });
    expect(await within(codeRegion).findByText('"ttd/app"')).toHaveClass('hljs-string');
    expect(getButton('applicationmetadata.json')).toHaveAttribute('aria-current', 'true');
    expect(getButton('texts')).not.toHaveAttribute('aria-current');
  });
});

function getCurrentFolder(name: string): HTMLElement {
  return screen.getByText(name, { selector: '[aria-current="location"]' });
}

function getStatusMessages(): string[] {
  return screen.getAllByRole('status').map((status) => status.textContent);
}

function getButton(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

function renderButtonOutside(): HTMLElement {
  render(<button type='button'>Outside</button>);
  return getButton('Outside');
}

const renderStudioFileBrowser = (
  props: Partial<StudioFileBrowserProps> = {},
  ref?: Ref<HTMLDivElement>,
): RenderResult => render(<StudioFileBrowser {...defaultProps} {...props} ref={ref} />);
