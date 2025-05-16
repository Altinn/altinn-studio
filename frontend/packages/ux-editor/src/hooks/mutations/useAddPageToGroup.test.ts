import { useAddPageToGroup } from './useAddPageToGroup';
import { renderHook } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateGroupsMutation } from './useUpdateGroupsMutation';
import { useAppContext } from '../useAppContext';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { org, app } from '@studio/testing/testids';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(),
}));
jest.mock('./useUpdateGroupsMutation');
jest.mock('../useAppContext');
jest.mock('app-shared/hooks/useStudioEnvironmentParams');
jest.mock('app-shared/contexts/ServicesContext');
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

const mockSetSelectedFormLayoutName = jest.fn();
const mockUpdateLayoutsForPreview = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockMutate = jest.fn();
const mockLayoutSetName = 'default';

describe('useAddPageToGroup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
    (useServicesContext as jest.Mock).mockReturnValue({
      createPage: jest.fn(),
    });
    (useAppContext as jest.Mock).mockReturnValue({
      selectedFormLayoutSetName: mockLayoutSetName,
      setSelectedFormLayoutName: mockSetSelectedFormLayoutName,
      updateLayoutsForPreview: mockUpdateLayoutsForPreview,
    });
    (useStudioEnvironmentParams as jest.Mock).mockReturnValue({
      org: org,
      app: app,
    });
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => key,
    });
    (useUpdateGroupsMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
    });
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
                id: 'ux_editor.page1',
              }),
            ]),
          }),
        ]),
      }),
      expect.any(Object),
    );
    const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess;
    await onSuccessCallback();
    expect(mockSetSelectedFormLayoutName).toHaveBeenCalledWith('ux_editor.page1');
    expect(mockUpdateLayoutsForPreview).toHaveBeenCalledWith(mockLayoutSetName);
  });

  it('should generate a unique page name', async () => {
    const mockPagesModel: PagesModel = {
      pages: [],
      groups: [
        {
          order: [{ id: 'ux_editor.page1' }, { id: 'ux_editor.page2' }],
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
              { id: 'ux_editor.page1' },
              { id: 'ux_editor.page2' },
              expect.objectContaining({
                id: 'ux_editor.page3',
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
            order: [{ id: 'ux_editor.page1' }],
          }),
        ],
      }),
      expect.any(Object),
    );
  });

  describe('useAddPageToGroup loop coverage', () => {
    it('should increment multiple times when many duplicates exist', () => {
      const mockPagesModel: PagesModel = {
        pages: [{ id: 'ux_editor.page1' }, { id: 'ux_editor.page2' }, { id: 'ux_editor.page3' }],
        groups: [
          {
            order: [{ id: 'ux_editor.page4' }, { id: 'ux_editor.page5' }],
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
                { id: 'ux_editor.page4' },
                { id: 'ux_editor.page5' },
                { id: 'ux_editor.page6' },
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
            order: [{ id: 'ux_editor.page1' }],
          },
        ],
      };
      const { result } = renderHook(() => useAddPageToGroup(mockPagesModel));
      result.current.addPageToGroup(0);
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          groups: [
            expect.objectContaining({
              order: [{ id: 'ux_editor.page1' }, { id: 'ux_editor.page2' }],
            }),
          ],
        }),
        expect.any(Object),
      );
    });

    it('should increment multiple times with gap in numbering', () => {
      const mockPagesModel: PagesModel = {
        pages: [{ id: 'ux_editor.page1' }, { id: 'ux_editor.page3' }, { id: 'ux_editor.page4' }],
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
              order: [{ id: 'ux_editor.page5' }],
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
