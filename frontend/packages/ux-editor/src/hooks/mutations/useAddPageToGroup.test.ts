import { useAddPageToGroup } from './useAddPageToGroup';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderHookWithProviders } from '../../../../ux-editor/src/testing/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org, selectedLayoutSet } from '@studio/testing/testids';

const mockSetSelectedFormLayoutName = jest.fn();
const mockUpdateLayoutsForPreview = jest.fn();

describe('useAddPageToGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.only('should add a page to the group and call the mutation', async () => {
    const mockPagesModel: PagesModel = {
      pages: [],
      groups: [
        {
          order: [],
        },
      ],
    };
    const { result } = render(mockPagesModel);
    await result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
      org,
      app,
      selectedLayoutSet,
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            order: expect.arrayContaining([
              expect.objectContaining({
                id: textMock('ux_editor.page') + '1',
              }),
            ]),
          }),
        ]),
      }),
      expect.any(Object),
    );
    expect(mockSetSelectedFormLayoutName).toHaveBeenCalledWith(textMock('ux_editor.page') + '1');
    expect(mockUpdateLayoutsForPreview).toHaveBeenCalledWith(selectedLayoutSet);
  });

  it('should generate a unique page name', async () => {
    const mockPagesModel: PagesModel = {
      pages: [],
      groups: [
        {
          order: [
            { id: textMock('ux_editor.page') + '1' },
            { id: textMock('ux_editor.page') + '2' },
          ],
        },
      ],
    };
    const { result } = render(mockPagesModel);
    result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({
            order: expect.arrayContaining([
              { id: textMock('ux_editor.page') + '1' },
              { id: textMock('ux_editor.page') + '2' },
              expect.objectContaining({
                id: textMock('ux_editor.page') + '3',
              }),
            ]),
          }),
        ]),
      }),
      expect.any(Object),
    );
  });

  it('should handle undefined pagesModel', () => {
    const { result } = renderHookWithProviders(() => useAddPageToGroup(undefined));
    result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [],
      }),
      expect.any(Object),
    );
  });

  it('should handle undefined pagesModel.groups', () => {
    const mockPagesModel: PagesModel = {
      pages: [],
      groups: undefined,
    };
    const { result } = render(mockPagesModel);
    result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [],
      }),
      expect.any(Object),
    );
  });

  it('should handle undefined group.order', () => {
    const mockPagesModel: PagesModel = {
      pages: [],
      groups: [
        {
          order: undefined,
        },
      ],
    };
    const { result } = render(mockPagesModel);
    result.current.addPageToGroup(0);
    expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [
          expect.objectContaining({
            order: [{ id: textMock('ux_editor.page') + '1' }],
          }),
        ],
      }),
      expect.any(Object),
    );
  });

  describe('useAddPageToGroup loop coverage', () => {
    it('should increment multiple times when many duplicates exist', () => {
      const mockPagesModel: PagesModel = {
        pages: [
          { id: textMock('ux_editor.page') + '1' },
          { id: textMock('ux_editor.page') + '2' },
          { id: textMock('ux_editor.page') + '3' },
        ],
        groups: [
          {
            order: [
              { id: textMock('ux_editor.page') + '4' },
              { id: textMock('ux_editor.page') + '5' },
            ],
          },
        ],
      };
      const { result } = render(mockPagesModel);
      result.current.addPageToGroup(0);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: [
            expect.objectContaining({
              order: [
                { id: textMock('ux_editor.page') + '4' },
                { id: textMock('ux_editor.page') + '5' },
                { id: textMock('ux_editor.page') + '6' },
              ],
            }),
          ],
        }),
        expect.any(Object),
      );
    });

    it('should increment exactly once when first attempt is taken', () => {
      const mockPagesModel: PagesModel = {
        pages: [],
        groups: [
          {
            order: [{ id: textMock('ux_editor.page') + '1' }],
          },
        ],
      };
      const { result } = render(mockPagesModel);
      result.current.addPageToGroup(0);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: [
            expect.objectContaining({
              order: [
                { id: textMock('ux_editor.page') + '1' },
                { id: textMock('ux_editor.page') + '2' },
              ],
            }),
          ],
        }),
        expect.any(Object),
      );
    });

    it('should increment multiple times with gap in numbering', () => {
      const mockPagesModel: PagesModel = {
        pages: [
          { id: textMock('ux_editor.page') + '1' },
          { id: textMock('ux_editor.page') + '3' },
          { id: textMock('ux_editor.page') + '4' },
        ],
        groups: [
          {
            order: [],
          },
        ],
      };
      const { result } = render(mockPagesModel);
      result.current.addPageToGroup(0);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: [
            expect.objectContaining({
              order: [{ id: textMock('ux_editor.page') + '5' }],
            }),
          ],
        }),
        expect.any(Object),
      );
    });
  });
});

const render = (pagesModel: PagesModel) => {
  return renderHookWithProviders(() => useAddPageToGroup(pagesModel), {
    appContextProps: {
      setSelectedFormLayoutName: mockSetSelectedFormLayoutName,
      updateLayoutsForPreview: mockUpdateLayoutsForPreview,
    },
  });
};
