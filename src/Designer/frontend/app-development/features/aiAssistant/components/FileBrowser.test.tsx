import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { get } from 'app-shared/utils/networking';
import { renderWithProviders } from '../../../test/mocks';
import { FileBrowser } from './FileBrowser';
import type { FileSystemObject } from './FileBrowser';

jest.mock('app-shared/utils/networking', () => ({ get: jest.fn() }));

// Like the real react-i18next, t stays the same between renders, so FileBrowser does not load the root folder again.
jest.mock('react-i18next', () => {
  const { textMock: translate } = jest.requireActual('@studio/testing/mocks/i18nMock');
  const t = (key: string): string => translate(key);
  return { useTranslation: () => ({ t }) };
});

const mockedGet = get as jest.MockedFunction<typeof get>;

const firstFile: FileSystemObject = { name: 'first.txt', path: 'first.txt', type: 'file' };
const secondFile: FileSystemObject = { name: 'second.txt', path: 'second.txt', type: 'file' };
const folder: FileSystemObject = { name: 'folder', path: 'folder', type: 'dir' };

describe('FileBrowser', () => {
  afterEach(jest.clearAllMocks);

  it('shows the last opened file when an earlier file request completes later', async () => {
    const user = userEvent.setup();
    const firstFileResponse = createDelayedResponse();
    mockContents({
      '': Promise.resolve([firstFile, secondFile]),
      [firstFile.path]: firstFileResponse.promise,
      [secondFile.path]: Promise.resolve([{ ...secondFile, content: 'Second' }]),
    });
    renderFileBrowser();

    await user.click(await findEntryButton(firstFile.name));
    await user.click(await findEntryButton(secondFile.name));
    await screen.findByRole('region', { name: secondFile.path });
    await act(async () => firstFileResponse.resolve([{ ...firstFile, content: 'First' }]));

    expect(screen.getByRole('region', { name: secondFile.path })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: firstFile.path })).not.toBeInTheDocument();
  });

  it('keeps the file closed when the file request completes after another folder has opened', async () => {
    const user = userEvent.setup();
    const fileResponse = createDelayedResponse();
    mockContents({
      '': Promise.resolve([firstFile, folder]),
      [firstFile.path]: fileResponse.promise,
      [folder.path]: Promise.resolve([]),
    });
    renderFileBrowser();

    await user.click(await findEntryButton(firstFile.name));
    await user.click(await findEntryButton(folder.name));
    await screen.findByText(textMock('ai_assistant.file_browser_empty_directory'));
    await act(async () => fileResponse.resolve([{ ...firstFile, content: 'First' }]));

    expect(screen.queryByRole('region', { name: firstFile.path })).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('ai_assistant.file_browser_no_file_selected')),
    ).toBeInTheDocument();
  });

  it('opens the file and keeps the current folder when the user opens the file while another folder loads', async () => {
    const user = userEvent.setup();
    const folderResponse = createDelayedResponse();
    mockContents({
      '': Promise.resolve([firstFile, folder]),
      [firstFile.path]: Promise.resolve([{ ...firstFile, content: 'First' }]),
      [folder.path]: folderResponse.promise,
    });
    renderFileBrowser();

    await user.click(await findEntryButton(folder.name));
    await user.click(await findEntryButton(firstFile.name));
    await screen.findByRole('region', { name: firstFile.path });
    await act(async () => folderResponse.resolve([]));

    expect(screen.getByRole('region', { name: firstFile.path })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: folder.name })).toBeInTheDocument();
  });
});

type DelayedResponse = {
  promise: Promise<unknown>;
  resolve: (data: unknown) => void;
};

const createDelayedResponse = (): DelayedResponse => {
  let resolve: (data: unknown) => void;
  const promise = new Promise<unknown>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const mockContents = (contentsByPath: Record<string, Promise<unknown>>): void => {
  mockedGet.mockImplementation((url: string) => {
    const path = new URL(url, window.location.origin).searchParams.get('path') ?? '';
    return contentsByPath[path];
  });
};

const findEntryButton = (name: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name });

const renderFileBrowser = (): void => {
  renderWithProviders()(<FileBrowser />);
};
