import { useAddPageToGroup } from './useAddPageToGroup';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderHookWithProviders } from '../../../../ux-editor/src/testing/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from 'app-shared/hooks/useSelectedFormLayoutSetName.test';

describe('useAddPageToGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add a page to the group and call the mutation', async () => {
    const mockPagesModel: PagesModel = {
      groups: [{ order: [{ id: textMock('ux_editor.page') + '1' }] }],
    };
    const { result } = renderUseAddPageToGroup(mockPagesModel);
    await result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      groups: [
        {
          name: textMock('ux_editor.page_layout_group') + ' 1',
          order: [
            { id: textMock('ux_editor.page') + '1' },
            { id: textMock('ux_editor.page') + '2' },
          ],
        },
      ],
    });
  });

  it('should generate a unique page name', async () => {
    const mockPagesModel: PagesModel = {
      groups: [
        {
          order: [
            { id: textMock('ux_editor.page') + '1' },
            { id: textMock('ux_editor.page') + '2' },
          ],
        },
      ],
    };
    const { result } = renderUseAddPageToGroup(mockPagesModel);
    await result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      groups: [
        {
          name: textMock('ux_editor.page_layout_group') + ' 1',
          order: [
            { id: textMock('ux_editor.page') + '1' },
            { id: textMock('ux_editor.page') + '2' },
            { id: textMock('ux_editor.page') + '3' },
          ],
        },
      ],
    });
  });

  describe('useAddPageToGroup loop coverage', () => {
    it('should increment multiple times when many duplicates exist', async () => {
      const mockPagesModel: PagesModel = {
        pages: [{ id: textMock('ux_editor.page') + '1' }, { id: textMock('ux_editor.page') + '2' }],
        groups: [
          {
            name: textMock('ux_editor.page_layout_group') + ' 1',
            order: [
              { id: textMock('ux_editor.page') + '3' },
              { id: textMock('ux_editor.page') + '4' },
            ],
          },
        ],
      };
      const { result } = renderUseAddPageToGroup(mockPagesModel);
      await result.current.addPageToGroup(0);
      expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
        groups: [
          {
            name: textMock('ux_editor.page_layout_group') + ' 1',
            order: [
              { id: textMock('ux_editor.page') + '3' },
              { id: textMock('ux_editor.page') + '4' },
              { id: textMock('ux_editor.page') + '5' },
            ],
          },
        ],
        pages: [{ id: textMock('ux_editor.page') + '1' }, { id: textMock('ux_editor.page') + '2' }],
      });
    });

    it('should increment exactly once when first attempt is taken', async () => {
      const mockPagesModel: PagesModel = {
        groups: [
          {
            order: [{ id: textMock('ux_editor.page') + '1' }],
          },
        ],
      };
      const { result } = renderUseAddPageToGroup(mockPagesModel);
      await result.current.addPageToGroup(0);
      expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
        groups: [
          {
            name: textMock('ux_editor.page_layout_group') + ' 1',
            order: [
              { id: textMock('ux_editor.page') + '1' },
              { id: textMock('ux_editor.page') + '2' },
            ],
          },
        ],
      });
    });

    it('should add incremented name to group when adding page to group without name', async () => {
      const mockPagesModel: PagesModel = {
        groups: [
          {
            name: textMock('ux_editor.page_layout_group') + ' 1',
            order: [
              { id: textMock('ux_editor.page') + '1' },
              { id: textMock('ux_editor.page') + '2' },
            ],
          },
          {
            order: [{ id: textMock('ux_editor.page') + '3' }],
          },
        ],
      };
      const { result } = renderUseAddPageToGroup(mockPagesModel);
      await result.current.addPageToGroup(1);
      expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
        org,
        app,
        layoutSet1NameMock,
        expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({ name: textMock('ux_editor.page_layout_group') + ' 2' }),
          ]),
        }),
      );
    });
  });
});

const renderUseAddPageToGroup = (pagesModel: PagesModel) => {
  return renderHookWithProviders(() => useAddPageToGroup(pagesModel));
};
