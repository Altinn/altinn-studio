import { useAddPageToGroup } from './useAddPageToGroup';
import { renderHook } from '@testing-library/react';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockSetSelectedFormLayoutName = jest.fn();
const mockUpdateLayoutsForPreview = jest.fn();
const mockMutate = jest.fn();
const mockLayoutSetName = 'default';

jest.mock('./useUpdateGroupsMutation', () => ({
  useUpdateGroupsMutation: jest.fn(() => ({
    mutate: mockMutate,
  })),
}));

jest.mock('../useAppContext', () => ({
  useAppContext: jest.fn(() => ({
    selectedFormLayoutSetName: mockLayoutSetName,
    setSelectedFormLayoutName: mockSetSelectedFormLayoutName,
    updateLayoutsForPreview: mockUpdateLayoutsForPreview,
  })),
}));

describe('useAddPageToGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add a page to the group and call the mutation', async () => {
    const mockPagesModel: PagesModel = {
      pages: [],
      groups: [
        {
          order: [],
        },
      ],
    };
    const { result } = render(mockPagesModel);
    result.current.addPageToGroup(0);
    expect(mockMutate).toHaveBeenCalledWith(
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
    const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess;
    await onSuccessCallback();
    expect(mockSetSelectedFormLayoutName).toHaveBeenCalledWith(textMock('ux_editor.page') + '1');
    expect(mockUpdateLayoutsForPreview).toHaveBeenCalledWith(mockLayoutSetName);
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
    expect(mockMutate).toHaveBeenCalledWith(
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
    const { result } = renderHook(() => useAddPageToGroup(undefined));
    result.current.addPageToGroup(0);
    expect(mockMutate).toHaveBeenCalledWith(
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
    const { result } = renderHook(() => useAddPageToGroup(mockPagesModel));
    result.current.addPageToGroup(0);
    expect(mockMutate).toHaveBeenCalledWith(
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
    const { result } = renderHook(() => useAddPageToGroup(mockPagesModel));
    result.current.addPageToGroup(0);
    expect(mockMutate).toHaveBeenCalledWith(
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
      const { result } = renderHook(() => useAddPageToGroup(mockPagesModel));
      result.current.addPageToGroup(0);
      expect(mockMutate).toHaveBeenCalledWith(
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
      const { result } = renderHook(() => useAddPageToGroup(mockPagesModel));
      result.current.addPageToGroup(0);
      expect(mockMutate).toHaveBeenCalledWith(
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

      const { result } = renderHook(() => useAddPageToGroup(mockPagesModel));
      result.current.addPageToGroup(0);
      expect(mockMutate).toHaveBeenCalledWith(
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
  return renderHook(() => useAddPageToGroup(pagesModel));
};
