import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { get } from 'app-shared/utils/networking';
import { StudioFileBrowser } from '@studio/components';
import type {
  StudioFileBrowserDirectory,
  StudioFileBrowserEntry,
  StudioFileBrowserFile,
  StudioFileBrowserTexts,
} from '@studio/components';
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
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const [directory, setDirectory] = useState<StudioFileBrowserDirectory>({
    path: ROOT_PATH,
    status: 'loading',
  });
  const [file, setFile] = useState<StudioFileBrowserFile | undefined>(undefined);

  const texts: StudioFileBrowserTexts = {
    breadcrumbsLabel: t('ai_assistant.file_browser_breadcrumbs_label'),
    root: t('ai_assistant.file_browser_root'),
    loadingDirectory: t('ai_assistant.file_browser_loading_directory'),
    emptyDirectory: t('ai_assistant.file_browser_empty_directory'),
    directoryEntryType: t('ai_assistant.file_browser_directory_entry_type'),
    fileEntryType: t('ai_assistant.file_browser_file_entry_type'),
    loadingFile: t('ai_assistant.file_browser_loading_file'),
    noFileSelected: t('ai_assistant.file_browser_no_file_selected'),
    collapseCode: t('ai_assistant.file_browser_collapse_code'),
    expandCode: t('ai_assistant.file_browser_expand_code'),
  };

  // The current folder stays visible until the next folder has loaded, so the user does not see a spinner.
  // Only the last request can update the folder, in case the requests complete in a different order.
  const latestDirectoryRequest = useRef(0);

  const openDirectory = useCallback(
    async (path: string): Promise<void> => {
      const request = ++latestDirectoryRequest.current;
      const isOutdated = (): boolean => request !== latestDirectoryRequest.current;
      try {
        const data = await get<FileSystemObject[]>(contentsUrl(org, app, path));
        if (isOutdated()) return;
        const entries = Array.isArray(data) ? data.map(toFileBrowserEntry) : [];
        setDirectory({ path, status: 'loaded', entries });
        setFile(undefined);
      } catch {
        if (isOutdated()) return;
        setFile(undefined);
        setDirectory({
          path,
          status: 'error',
          errorMessage: t('ai_assistant.file_browser_directory_error'),
        });
      }
    },
    [org, app, t],
  );

  const openFile = async (path: string): Promise<void> => {
    setFile({ path, status: 'loading' });
    try {
      const data = await get<FileSystemObject[] | FileSystemObject | null>(
        contentsUrl(org, app, path),
      );
      const entry = Array.isArray(data) ? data[0] : data;
      if (entry?.content == null) {
        setFile({
          path,
          status: 'error',
          errorMessage: t('ai_assistant.file_browser_file_unavailable'),
        });
      } else {
        setFile({ path, status: 'loaded', content: entry.content });
      }
    } catch {
      setFile({ path, status: 'error', errorMessage: t('ai_assistant.file_browser_file_error') });
    }
  };

  useEffect(() => {
    if (org && app) {
      void openDirectory(ROOT_PATH);
    }
  }, [org, app, openDirectory]);

  return (
    <StudioFileBrowser
      className={classes.fileBrowser}
      directory={directory}
      file={file}
      onOpenDirectory={(path) => void openDirectory(path)}
      onOpenFile={(path) => void openFile(path)}
      texts={texts}
    />
  );
};

function contentsUrl(org: string, app: string, path: string): string {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return `/designer/api/repos/repo/${org}/${app}/contents${query}`;
}

function toFileBrowserEntry({ name, path, type }: FileSystemObject): StudioFileBrowserEntry {
  return { name, path, type: type.toLowerCase() === 'dir' ? 'directory' : 'file' };
}
