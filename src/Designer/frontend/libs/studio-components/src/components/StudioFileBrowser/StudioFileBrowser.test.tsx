import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioFileBrowser } from './StudioFileBrowser';
import type { StudioFileBrowserProps, StudioFileBrowserTexts } from './StudioFileBrowser';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';

const texts: StudioFileBrowserTexts = {
  breadcrumbsLabel: 'Folder path',
  root: 'Root',
  loadingDirectory: 'Loading files',
  emptyDirectory: 'The folder is empty',
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
  onOpenDirectory: jest.fn(),
  onOpenFile: jest.fn(),
  texts,
};

describe('StudioFileBrowser', () => {
  afterEach(jest.clearAllMocks);

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
    expect(getCurrentBreadcrumb('config')).toBeInTheDocument();
  });

  it('does not render breadcrumbs for folders above the parent folder', () => {
    renderStudioFileBrowser({
      directory: { path: 'App/config/texts', status: 'loaded', entries: [] },
    });
    expect(getButton('config')).toBeInTheDocument();
    expect(getCurrentBreadcrumb('texts')).toBeInTheDocument();
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
    expect(getCurrentBreadcrumb('App')).toBeInTheDocument();
    await user.click(getButton(texts.root));
    expect(defaultProps.onOpenDirectory).toHaveBeenCalledWith('');
  });

  it('shows the root as the current folder when the path is empty', () => {
    renderStudioFileBrowser({ directory: { path: '', status: 'loaded', entries: [] } });
    expect(screen.queryByRole('button', { name: texts.root })).not.toBeInTheDocument();
    expect(getCurrentBreadcrumb(texts.root)).toBeInTheDocument();
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

  it('shows a spinner while the folder loads', () => {
    renderStudioFileBrowser({ directory: { path: '', status: 'loading' } });
    expect(screen.getByText(texts.loadingDirectory)).toBeInTheDocument();
  });

  it('shows the error message when the folder could not load', () => {
    const errorMessage = 'Could not load the files';
    renderStudioFileBrowser({ directory: { path: '', status: 'error', errorMessage } });
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows a message when the folder is empty', () => {
    renderStudioFileBrowser({ directory: { path: '', status: 'loaded', entries: [] } });
    expect(screen.getByText(texts.emptyDirectory)).toBeInTheDocument();
  });

  it('asks the user to select a file when no file is given', () => {
    renderStudioFileBrowser();
    expect(screen.getByText(texts.noFileSelected)).toBeInTheDocument();
  });

  it('shows a spinner while the file loads', () => {
    renderStudioFileBrowser({
      file: { path: 'App/config/applicationmetadata.json', status: 'loading' },
    });
    expect(screen.getByText(texts.loadingFile)).toBeInTheDocument();
  });

  it('shows the error message when the file could not load', () => {
    const errorMessage = 'Could not load the file';
    renderStudioFileBrowser({
      file: { path: 'App/config/applicationmetadata.json', status: 'error', errorMessage },
    });
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows the content of the file in the code viewer and marks the file as current', () => {
    const path = 'App/config/applicationmetadata.json';
    renderStudioFileBrowser({ file: { path, status: 'loaded', content: '{ "id": "ttd/app" }' } });
    expect(screen.getByRole('region', { name: path })).toHaveTextContent('"ttd/app"');
    expect(getButton('applicationmetadata.json')).toHaveAttribute('aria-current', 'true');
    expect(getButton('texts')).not.toHaveAttribute('aria-current');
  });
});

function getCurrentBreadcrumb(name: string): HTMLElement {
  return screen.getByText(name, { selector: '[aria-current="location"] > span' });
}

function getButton(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

const renderStudioFileBrowser = (
  props: Partial<StudioFileBrowserProps> = {},
  ref?: Ref<HTMLDivElement>,
): RenderResult => render(<StudioFileBrowser {...defaultProps} {...props} ref={ref} />);
