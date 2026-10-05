import { forwardRef, useEffect, useId, useRef } from 'react';
import type { HTMLAttributes, ReactElement, Ref, RefObject } from 'react';
import cn from 'classnames';
import { useForwardedRef } from '@studio/hooks';
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
  /** Screen readers read the type of each entry after its name. */
  directoryEntryType: string;
  fileEntryType: string;
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
  const rootRef = useForwardedRef<HTMLDivElement>(ref);
  const currentLocationRef = useRef<HTMLSpanElement>(null);
  const currentLocationId = useId();
  const requestLocationFocus = useLocationFocus(directory.path, rootRef, currentLocationRef);

  const openDirectory = (path: string): void => {
    requestLocationFocus();
    onOpenDirectory(path);
  };

  return (
    <div className={cn(classes.fileBrowser, givenClass)} {...rest} ref={rootRef}>
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
              currentLocationId={currentLocationId}
              currentLocationRef={currentLocationRef}
              onOpenDirectory={openDirectory}
              texts={texts}
            />
            <DirectoryContent
              directory={directory}
              selectedFilePath={file?.path}
              currentLocationId={currentLocationId}
              onOpenDirectory={openDirectory}
              onOpenFile={onOpenFile}
              texts={texts}
            />
          </div>
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={FILE_CONTENT_MINIMUM_WIDTH}>
          <div className={classes.fileContent}>
            <div role='status' className={classes.fileStatus}>
              {file?.status === 'loading' && (
                <StudioCenter>
                  <StudioSpinner aria-hidden spinnerTitle={texts.loadingFile} />
                </StudioCenter>
              )}
            </div>
            <FileContent file={file} texts={texts} />
          </div>
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </div>
  );
}

/** Opening a folder removes the focused button, so the focus moves to the new current folder. */
function useLocationFocus(
  directoryPath: string,
  rootRef: RefObject<HTMLElement | null>,
  currentLocationRef: RefObject<HTMLElement | null>,
): () => void {
  const isFocusRequested = useRef(false);

  useEffect(() => {
    if (!isFocusRequested.current) return;
    isFocusRequested.current = false;
    if (isFocusInsideOrLost(rootRef.current)) currentLocationRef.current?.focus();
  }, [directoryPath, rootRef, currentLocationRef]);

  return () => {
    isFocusRequested.current = true;
  };
}

function isFocusInsideOrLost(root: HTMLElement | null): boolean {
  const { activeElement } = document;
  return (
    !activeElement || activeElement === document.body || Boolean(root?.contains(activeElement))
  );
}

type DirectoryBreadcrumbsProps = {
  path: string;
  currentLocationId: string;
  currentLocationRef: Ref<HTMLSpanElement>;
  onOpenDirectory: (path: string) => void;
  texts: StudioFileBrowserTexts;
};

function DirectoryBreadcrumbs({
  path,
  currentLocationId,
  currentLocationRef,
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
            <CurrentBreadcrumb id={currentLocationId} spanRef={currentLocationRef}>
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

function CurrentBreadcrumb({
  children,
  id,
  spanRef,
}: BreadcrumbProps & { id: string; spanRef: Ref<HTMLSpanElement> }): ReactElement {
  return (
    <span
      ref={spanRef}
      id={id}
      tabIndex={-1}
      className={cn(classes.breadcrumb, classes.currentBreadcrumb)}
      aria-current='location'
    >
      {children}
    </span>
  );
}

type DirectoryContentProps = {
  directory: StudioFileBrowserDirectory;
  selectedFilePath?: string;
  currentLocationId: string;
  onOpenDirectory: (path: string) => void;
  onOpenFile: (path: string) => void;
  texts: StudioFileBrowserTexts;
};

function DirectoryContent({
  directory,
  selectedFilePath,
  currentLocationId,
  onOpenDirectory,
  onOpenFile,
  texts,
}: DirectoryContentProps): ReactElement {
  return (
    <>
      <div role='status'>
        {directory.status === 'loading' && (
          <StudioSpinner
            aria-hidden
            className={classes.message}
            spinnerTitle={texts.loadingDirectory}
          />
        )}
        {directory.status === 'loaded' && !directory.entries.length && (
          <StudioParagraph className={classes.message}>{texts.emptyDirectory}</StudioParagraph>
        )}
      </div>
      {directory.status === 'error' && <ErrorMessage message={directory.errorMessage} />}
      {directory.status === 'loaded' && directory.entries.length > 0 && (
        <ul className={classes.entryList} aria-labelledby={currentLocationId}>
          {directory.entries.map((entry) => (
            <li key={entry.path}>
              <EntryButton
                entry={entry}
                isSelected={entry.path === selectedFilePath}
                onClick={() =>
                  entry.type === 'directory' ? onOpenDirectory(entry.path) : onOpenFile(entry.path)
                }
                texts={texts}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type EntryButtonProps = {
  entry: StudioFileBrowserEntry;
  isSelected: boolean;
  onClick: () => void;
  texts: StudioFileBrowserTexts;
};

function EntryButton({ entry, isSelected, onClick, texts }: EntryButtonProps): ReactElement {
  const entryTypeId = useId();
  const isDirectory = entry.type === 'directory';
  const Icon = isDirectory ? FolderIcon : FileTextIcon;
  return (
    <StudioButton
      variant='tertiary'
      className={cn(classes.entry, isSelected && classes.selectedEntry)}
      aria-current={isSelected || undefined}
      aria-describedby={entryTypeId}
      title={entry.name}
      onClick={onClick}
    >
      <Icon aria-hidden className={classes.entryIcon} />
      <span className={classes.entryName}>{entry.name}</span>
      <span id={entryTypeId} hidden>
        {isDirectory ? texts.directoryEntryType : texts.fileEntryType}
      </span>
      {isDirectory && <ChevronRightIcon aria-hidden className={classes.directoryChevron} />}
    </StudioButton>
  );
}

type FileContentProps = {
  file?: StudioFileBrowserFile;
  texts: StudioFileBrowserTexts;
};

function FileContent({ file, texts }: FileContentProps): ReactElement | null {
  if (!file) {
    return (
      <StudioCenter>
        <StudioParagraph>{texts.noFileSelected}</StudioParagraph>
      </StudioCenter>
    );
  }

  switch (file.status) {
    case 'loading':
      return null;
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
    <StudioAlert role='alert' data-color='danger' className={classes.message}>
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
