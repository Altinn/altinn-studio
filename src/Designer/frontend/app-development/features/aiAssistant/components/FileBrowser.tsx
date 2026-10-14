import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
  path: string;
  type: string;
  content?: string | null;
};

const ROOT_PATH = '';

export const FileBrowser = (): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const [directory, setDirectory] = useState<StudioFileBrowserDirectory>({
    path: ROOT_PATH,
    status: 'loading',
  });
  const [file, setFile] = useState<StudioFileBrowserFile>();

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

  // The requests can complete in a different order.
  // Only the response to the last folder or file that the user opened can change the view.
  const latestRequest = useRef(0);

  // The current folder stays visible until the next folder has loaded, so the user does not see a spinner.
  const openDirectory = useCallback(
    async (path: string): Promise<void> => {
      const request = ++latestRequest.current;
      const nextDirectory = await fetchDirectory(org, app, path, t);
      if (request !== latestRequest.current) return;
      setDirectory(nextDirectory);
      setFile(undefined);
    },
    [org, app, t],
  );

  const openFile = async (path: string): Promise<void> => {
    const request = ++latestRequest.current;
    setFile({ path, status: 'loading' });
    const nextFile = await fetchFile(org, app, path, t);
    if (request !== latestRequest.current) return;
    setFile(nextFile);
  };

  useEffect(() => {
    void openDirectory(ROOT_PATH);
  }, [openDirectory]);

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

async function fetchDirectory(
  org: string,
  app: string,
  path: string,
  t: TFunction,
): Promise<StudioFileBrowserDirectory> {
  try {
    const entries = await get<FileSystemObject[]>(contentsUrl(org, app, path));
    return { path, status: 'loaded', entries: entries.map(toFileBrowserEntry) };
  } catch {
    return { path, status: 'error', errorMessage: t('ai_assistant.file_browser_directory_error') };
  }
}

async function fetchFile(
  org: string,
  app: string,
  path: string,
  t: TFunction,
): Promise<StudioFileBrowserFile> {
  try {
    const [entry] = await get<FileSystemObject[]>(contentsUrl(org, app, path));
    if (entry?.content == null) {
      return {
        path,
        status: 'error',
        errorMessage: t('ai_assistant.file_browser_file_unavailable'),
      };
    }
    return { path, status: 'loaded', content: entry.content };
  } catch {
    return { path, status: 'error', errorMessage: t('ai_assistant.file_browser_file_error') };
  }
}

function contentsUrl(org: string, app: string, path: string): string {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return `/designer/api/repos/repo/${org}/${app}/contents${query}`;
}

function toFileBrowserEntry({ name, path, type }: FileSystemObject): StudioFileBrowserEntry {
  return { name, path, type: type.toLowerCase() === 'dir' ? 'directory' : 'file' };
}
