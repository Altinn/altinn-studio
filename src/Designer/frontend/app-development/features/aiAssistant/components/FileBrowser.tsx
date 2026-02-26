import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { ReactElement } from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { get } from 'app-shared/utils/networking';
import { StudioButton, StudioCenter, StudioParagraph, StudioSpinner } from '@studio/components';
import { FolderIcon, FileTextIcon, HouseIcon, ChevronRightIcon } from '@studio/icons';
import classes from './FileBrowser.module.css';

export type FileSystemObject = {
  name: string;
  sha?: string;
  encoding?: string;
  content?: string | null;
  path: string;
  type: string;
};

const ROOT_PATH = '';

export const FileBrowser = (): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();

  const [currentPath, setCurrentPath] = useState<string>(ROOT_PATH);
  const [items, setItems] = useState<FileSystemObject[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileSystemObject | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const breadcrumbRef = useRef<HTMLDivElement | null>(null);

  const canBrowse = Boolean(org && app);

  const loadDirectory = useCallback(
    async (path: string): Promise<void> => {
      if (!org || !app) return;

      setIsLoadingList(true);
      setError(null);
      try {
        const url =
          `/designer/api/repos/repo/${org}/${app}/contents` +
          (path ? `?path=${encodeURIComponent(path)}` : '');
        const data = await get<FileSystemObject[]>(url);
        setItems(Array.isArray(data) ? data : []);
        setCurrentPath(path);
        setSelectedFile(null);
        setFileContent(null);
      } catch (e) {
        setError('Kunne ikke laste inn filer.');
      } finally {
        setIsLoadingList(false);
      }
    },
    [org, app],
  );

  const loadFile = async (file: FileSystemObject): Promise<void> => {
    if (!canBrowse) return;

    setSelectedFile(file);
    setFileContent(null);
    setIsLoadingFile(true);
    setError(null);
    try {
      const url = `/designer/api/repos/repo/${org}/${app}/contents?path=${encodeURIComponent(
        file.path,
      )}`;
      const data = await get<FileSystemObject[] | FileSystemObject | null>(url);

      const entry: FileSystemObject | null = Array.isArray(data)
        ? data && data.length > 0
          ? data[0]
          : null
        : data;

      if (!entry || entry.content == null) {
        setFileContent('');
        setError('Filinnhold er ikke tilgjengelig fra tjeneren for denne filen.');
      } else {
        setFileContent(entry.content);
      }
    } catch (e) {
      setError('Kunne ikke laste inn filinnhold.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  useEffect(() => {
    if (canBrowse) {
      void loadDirectory(ROOT_PATH);
    }
  }, [canBrowse, loadDirectory]);

  useEffect(() => {
    if (breadcrumbRef.current) {
      breadcrumbRef.current.scrollLeft = breadcrumbRef.current.scrollWidth;
    }
  }, [currentPath]);

  const handleItemClick = (item: FileSystemObject): void => {
    const isDir = item.type.toLowerCase() === 'dir';
    if (isDir) {
      void loadDirectory(item.path);
    } else {
      void loadFile(item);
    }
  };

  return (
    <div className={classes.container}>
      <div className={classes.sidebar}>
        <div className={classes.sidebarHeader}>
          <div className={classes.breadcrumb} ref={breadcrumbRef}>
            <button
              type='button'
              className={classes.breadcrumbItem}
              onClick={() => void loadDirectory(ROOT_PATH)}
              disabled={!currentPath}
            >
              <HouseIcon aria-hidden />
              <span className={classes.breadcrumbLabel}>Rot</span>
            </button>
            {currentPath &&
              currentPath
                .split('/')
                .filter(Boolean)
                .map((segment, index, allSegments) => {
                  const segmentPath = allSegments.slice(0, index + 1).join('/');
                  return (
                    <React.Fragment key={segmentPath}>
                      <span className={classes.breadcrumbSeparator}>
                        <ChevronRightIcon aria-hidden />
                      </span>
                      <button
                        type='button'
                        className={classes.breadcrumbItem}
                        onClick={() => void loadDirectory(segmentPath)}
                      >
                        <FolderIcon aria-hidden />
                        <span className={classes.breadcrumbLabel}>{segment}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
          </div>
        </div>
        {isLoadingList && (
          <StudioCenter className={classes.placeholder}>
            <StudioSpinner spinnerTitle='Laster filer...' aria-hidden='true' />
          </StudioCenter>
        )}
        {!isLoadingList && !items.length && (
          <div className={classes.placeholder}>
            <StudioParagraph>Ingen filer funnet.</StudioParagraph>
          </div>
        )}
        <ul className={classes.fileList}>
          {items.map((item) => {
            const isDir = item.type.toLowerCase() === 'dir';
            const isSelected = selectedFile?.path === item.path;
            const depth = item.path.split('/').filter(Boolean).length - 1;
            const indentStyle = { paddingLeft: `${16 + depth * 12}px` };
            return (
              <li key={item.path}>
                <StudioButton
                  variant={isSelected ? 'secondary' : 'tertiary'}
                  className={isSelected ? classes.fileButtonSelected : classes.fileButton}
                  fullWidth
                  style={indentStyle}
                  onClick={() => handleItemClick(item)}
                >
                  <span className={classes.fileIcon}>
                    {isDir ? <FolderIcon aria-hidden /> : <FileTextIcon aria-hidden />}
                  </span>
                  <span className={classes.fileName}>{item.name}</span>
                </StudioButton>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={classes.viewer}>
        {error && (
          <div className={classes.error}>
            <StudioParagraph>{error}</StudioParagraph>
          </div>
        )}
        {!error && !selectedFile && (
          <div className={classes.placeholder}>
            <StudioParagraph>Velg en fil for å vise innhold.</StudioParagraph>
          </div>
        )}
        {!error && selectedFile && (
          <div className={classes.viewerHeader}>
            <span className={classes.viewerTitle}>{selectedFile.path}</span>
            {isLoadingFile && (
              <span className={classes.loadingIndicator}>
                <StudioSpinner spinnerTitle='Laster innhold...' aria-hidden='true' data-size='sm' />
              </span>
            )}
          </div>
        )}
        {!error && selectedFile && <pre className={classes.code}>{fileContent ?? ''}</pre>}
      </div>
    </div>
  );
};
