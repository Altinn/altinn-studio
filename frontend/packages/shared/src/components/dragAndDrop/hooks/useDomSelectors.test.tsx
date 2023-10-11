import React from 'react';
import { renderHook } from '@testing-library/react';
import { useDomSelectors } from 'app-shared/components/dragAndDrop/hooks/useDomSelectors';
import { DragAndDropRootContext } from 'app-shared/components/dragAndDrop/DragAndDropProvider';
import {
  extractIdFromDomItemId,
  extractIdFromDomListId,
} from 'app-shared/components/dragAndDrop/utils/domUtils';

// Test data:
const id = 'id';
const uniqueDomId = 'baseId';

describe('useDomSelectors', () => {
  afterEach(jest.clearAllMocks);

  it('Returns the base id and selector attributes for list and item components with the given id', () => {
    const { result } = renderHook(() => useDomSelectors(id), {
      wrapper: ({ children }) => (
        <DragAndDropRootContext.Provider
          value={{ uniqueDomId, rootId: 'rootId', onDrop: jest.fn(), gap: '1rem' }}
        >
          {children}
        </DragAndDropRootContext.Provider>
      ),
    });
    expect(result.current).toEqual({
      baseId: uniqueDomId,
      list: {
        id: expect.any(String),
        className: expect.any(String),
      },
      item: {
        id: expect.any(String),
        className: expect.any(String),
      },
    });
    const { list, item } = result.current;
    expect(extractIdFromDomListId(uniqueDomId, list.id)).toEqual(id);
    expect(extractIdFromDomItemId(uniqueDomId, item.id)).toEqual(id);
  });

  it('Throws an error if not wrapped by a DragAndDropProvider', () => {
    jest.spyOn(console, 'error').mockImplementation();
    const renderFn = () => renderHook(() => useDomSelectors(id));
    expect(renderFn).toThrow(
      new Error('useDomSelectors must be used within a DragAndDropRootContext provider.'),
    );
  });
});
