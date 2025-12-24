import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { createQueryClientMock } from '../../mocks/queryClientMock';
import type { RenderHookResult } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from '../../types/QueryKey';
import { useLayoutSetPath, findFirstPage } from './useLayoutSetPath';
import type { PagesModel } from '../../types/api/dto/PagesModel';

const org = 'testOrg';
const app = 'testApp';
const layoutSetId = 'testLayoutSet';
const getPages = jest.fn();

const pagesModelWithPages: PagesModel = {
  pages: [{ id: 'page1' }, { id: 'page2' }, { id: 'page3' }],
};

const pagesModelWithSinglePage: PagesModel = {
  pages: [{ id: 'page1' }],
};

const pagesModelWithGroups: PagesModel = {
  groups: [
    { order: [{ id: 'group1-page1' }, { id: 'group1-page2' }] },
    { order: [{ id: 'group2-page1' }] },
  ],
};

describe('useLayoutSetPath', () => {
  it('findFirstPage returns undefined when pagesModel is undefined', () => {
    expect(findFirstPage(undefined)).toBeUndefined();
  });

  it('findFirstPage returns first page id from pages array when model has pages', () => {
    expect(findFirstPage(pagesModelWithPages)).toBe('page1');
  });

  it('findFirstPage returns first page id from first group when model has groups', () => {
    expect(findFirstPage(pagesModelWithGroups)).toBe('group1-page1');
  });

  it('returns path with layout param when first page exists', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.Pages, org, app, layoutSetId], pagesModelWithSinglePage);
    const { result } = renderUseLayoutSetPath(queryClient);
    expect(result.current).toBe(`/${org}/${app}/ui-editor/layoutSet/${layoutSetId}?layout=page1`);
  });

  it('returns base path when no first page exists', async () => {
    const queryClient = createQueryClientMock();
    const { result } = renderUseLayoutSetPath(queryClient);
    expect(result.current).toBe(`/${org}/${app}/ui-editor/layoutSet/${layoutSetId}`);
  });
});

const renderUseLayoutSetPath = (
  queryClient: QueryClient = createQueryClientMock(),
): RenderHookResult<string, void> =>
  renderHookWithProviders(() => useLayoutSetPath(org, app, layoutSetId), {
    queries: { getPages },
    queryClient,
  });
