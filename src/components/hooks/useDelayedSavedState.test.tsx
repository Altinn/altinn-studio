import { act, renderHook, waitFor } from '@testing-library/react';

import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';

test('should debounce input by default', async () => {
  const handleDataChangeMock = jest.fn();
  const { result } = renderHook(() => useDelayedSavedState(handleDataChangeMock));

  act(() => result.current.setValue('great text'));
  await waitFor(() => expect(result.current.value).toBe('great text'));
});
