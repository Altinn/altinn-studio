import { forwardRef } from 'react';
import type { HTMLAttributes, ReactElement, Ref } from 'react';
import cn from 'classnames';
import { ChevronRightIcon, FileTextIcon, FolderIcon } from '@studio/icons';
import { StudioAlert } from '../StudioAlert';
import { StudioBreadcrumbs } from '../StudioBreadcrumbs';
import { StudioButton } from '../StudioButton';
import { StudioCenter } from '../StudioCenter';
import { StudioCodeViewer, getCodeLanguageFromFileName } from '../StudioCodeViewer';
import { StudioParagraph } from '../StudioParagraph';
import { StudioResizableLayout } from '../StudioResizableLayout';
import { StudioSpinner } from '../StudioSpinner';
import classes from './StudioFileBrowser.module.css';

export type StudioFileBrowserEntry = {
  name: string;
  path: string;
  type: 'file' | 'directory';
};

export type StudioFileBrowserDirectory = { path: string } & (
  | { status: 'loading' }
  | { status: 'loaded'; entries: StudioFileBrowserEntry[] }
  | { status: 'error'; errorMessage: string }
);

export type StudioFileBrowserFile = { path: string } & (
  | { status: 'loading' }
  | { status: 'loaded'; content: string }
  | { status: 'error'; errorMessage: string }
);

export type StudioFileBrowserTexts = {
  breadcrumbsLabel: string;
  root: string;
  loadingDirectory: string;
  emptyDirectory: string;
  loadingFile: string;
  noFileSelected: string;
  collapseCode: string;
  expandCode: string;
};

export type StudioFileBrowserProps = HTMLAttributes<HTMLDivElement> & {
  directory: StudioFileBrowserDirectory;
  /** The file to show in the code viewer. Leave it out when no file is selected. */
  file?: StudioFileBrowserFile;
  onOpenDirectory: (path: string) => void;
  onOpenFile: (path: string) => void;
  texts: StudioFileBrowserTexts;
};

function StudioFileBrowser(
  {
    directory,
    file,
    onOpenDirectory,
    onOpenFile,
    texts,
    className: givenClass,
    ...rest
  }: StudioFileBrowserProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <div className={cn(classes.fileBrowser, givenClass)} {...rest} ref={ref}>
      <StudioResizableLayout.Container
        orientation='horizontal'
        localStorageContext={RESIZABLE_LAYOUT_STORAGE_KEY}
      >
        <StudioResizableLayout.Element
          minimumSize={SIDEBAR_MINIMUM_WIDTH}
          maximumSize={SIDEBAR_MAXIMUM_WIDTH}
        >
          <div className={classes.sidebar}>
            <DirectoryBreadcrumbs
              path={directory.path}
              onOpenDirectory={onOpenDirectory}
              texts={texts}
            />
            <DirectoryContent
              directory={directory}
              selectedFilePath={file?.path}
              onOpenDirectory={onOpenDirectory}
              onOpenFile={onOpenFile}
              texts={texts}
            />
          </div>
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={FILE_CONTENT_MINIMUM_WIDTH}>
          <div className={classes.fileContent}>
            <FileContent file={file} texts={texts} />
          </div>
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </div>
  );
}

type DirectoryBreadcrumbsProps = {
  path: string;
  onOpenDirectory: (path: string) => void;
  texts: StudioFileBrowserTexts;
};

function DirectoryBreadcrumbs({
  path,
  onOpenDirectory,
  texts,
}: DirectoryBreadcrumbsProps): ReactElement {
  const segments = splitPath(path);
  const currentName = segments.at(-1);
  const parentPath = joinPath(segments.slice(0, -1));
  const parentName = segments.at(-2);
  const rootLabel = <span className={classes.breadcrumbLabel}>{texts.root}</span>;

  return (
    // The breadcrumbs element sets its own navigation role only when the last item is a link.
    // Here the items are buttons, so this element gives the navigation landmark.
    <nav aria-label={texts.breadcrumbsLabel} className={classes.breadcrumbs}>
      <StudioBreadcrumbs>
        <StudioBreadcrumbs.List>
          {currentName !== undefined && (
            <StudioBreadcrumbs.Item>
              <BreadcrumbButton
                onClick={() => onOpenDirectory(parentPath)}
                title={parentName ?? texts.root}
              >
                {parentName === undefined ? (
                  rootLabel
                ) : (
                  <span className={classes.breadcrumbLabel}>{parentName}</span>
                )}
              </BreadcrumbButton>
            </StudioBreadcrumbs.Item>
          )}
          <StudioBreadcrumbs.Item>
            <CurrentBreadcrumb>
              {currentName === undefined ? (
                rootLabel
              ) : (
                <span className={classes.breadcrumbLabel}>{currentName}</span>
              )}
            </CurrentBreadcrumb>
          </StudioBreadcrumbs.Item>
        </StudioBreadcrumbs.List>
      </StudioBreadcrumbs>
    </nav>
  );
}

type BreadcrumbProps = {
  children: ReactElement | string;
};

function BreadcrumbButton({
  children,
  onClick,
  title,
}: BreadcrumbProps & { onClick: () => void; title?: string }): ReactElement {
  return (
    <StudioBreadcrumbs.Link asChild>
      <button type='button' className={classes.breadcrumb} onClick={onClick} title={title}>
        {children}
      </button>
    </StudioBreadcrumbs.Link>
  );
}

function CurrentBreadcrumb({ children }: BreadcrumbProps): ReactElement {
  return (
    <span className={cn(classes.breadcrumb, classes.currentBreadcrumb)} aria-current='location'>
      {children}
    </span>
  );
}

type DirectoryContentProps = {
  directory: StudioFileBrowserDirectory;
  selectedFilePath?: string;
  onOpenDirectory: (path: string) => void;
  onOpenFile: (path: string) => void;
  texts: StudioFileBrowserTexts;
};

function DirectoryContent({
  directory,
  selectedFilePath,
  onOpenDirectory,
  onOpenFile,
  texts,
}: DirectoryContentProps): ReactElement {
  switch (directory.status) {
    case 'loading':
      return (
        <StudioSpinner
          aria-hidden
          className={classes.message}
          spinnerTitle={texts.loadingDirectory}
        />
      );
    case 'error':
      return <ErrorMessage message={directory.errorMessage} />;
    case 'loaded':
      if (!directory.entries.length) {
        return (
          <StudioParagraph className={classes.message}>{texts.emptyDirectory}</StudioParagraph>
        );
      }
      return (
        <ul className={classes.entryList}>
          {directory.entries.map((entry) => (
            <li key={entry.path}>
              <EntryButton
                entry={entry}
                isSelected={entry.path === selectedFilePath}
                onClick={() =>
                  entry.type === 'directory' ? onOpenDirectory(entry.path) : onOpenFile(entry.path)
                }
              />
            </li>
          ))}
        </ul>
      );
  }
}

type EntryButtonProps = {
  entry: StudioFileBrowserEntry;
  isSelected: boolean;
  onClick: () => void;
};

function EntryButton({ entry, isSelected, onClick }: EntryButtonProps): ReactElement {
  const Icon = entry.type === 'directory' ? FolderIcon : FileTextIcon;
  return (
    <StudioButton
      variant='tertiary'
      className={cn(classes.entry, isSelected && classes.selectedEntry)}
      aria-current={isSelected || undefined}
      title={entry.name}
      onClick={onClick}
    >
      <Icon aria-hidden className={classes.entryIcon} />
      <span className={classes.entryName}>{entry.name}</span>
      {entry.type === 'directory' && (
        <ChevronRightIcon aria-hidden className={classes.directoryChevron} />
      )}
    </StudioButton>
  );
}

type FileContentProps = {
  file?: StudioFileBrowserFile;
  texts: StudioFileBrowserTexts;
};

function FileContent({ file, texts }: FileContentProps): ReactElement {
  if (!file) {
    return (
      <StudioCenter>
        <StudioParagraph>{texts.noFileSelected}</StudioParagraph>
      </StudioCenter>
    );
  }

  switch (file.status) {
    case 'loading':
      return (
        <StudioCenter>
          <StudioSpinner aria-hidden spinnerTitle={texts.loadingFile} />
        </StudioCenter>
      );
    case 'error':
      return (
        <StudioCenter>
          <ErrorMessage message={file.errorMessage} />
        </StudioCenter>
      );
    case 'loaded':
      return (
        <StudioCodeViewer
          className={classes.codeViewer}
          title={file.path}
          code={file.content}
          language={getCodeLanguageFromFileName(file.path)}
          texts={{ collapse: texts.collapseCode, expand: texts.expandCode }}
        />
      );
  }
}

function ErrorMessage({ message }: { message: string }): ReactElement {
  return (
    <StudioAlert data-color='danger' className={classes.message}>
      {message}
    </StudioAlert>
  );
}

const RESIZABLE_LAYOUT_STORAGE_KEY = 'studio-file-browser';
const SIDEBAR_MINIMUM_WIDTH = 200;
const SIDEBAR_MAXIMUM_WIDTH = 480;
const FILE_CONTENT_MINIMUM_WIDTH = 300;

function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function joinPath(segments: string[]): string {
  return segments.join('/');
}

const ForwardedStudioFileBrowser = forwardRef(StudioFileBrowser);

export { ForwardedStudioFileBrowser as StudioFileBrowser };
