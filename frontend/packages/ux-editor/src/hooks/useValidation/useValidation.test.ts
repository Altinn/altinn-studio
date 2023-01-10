import { act, renderHook } from '@testing-library/react';
import { useValidation } from './useValidation';

test('should have updated validationError after validate has been called', () => {
  const { result: validationHook } = renderHook(() =>
    useValidation({ required: { message: 'Field is required' } })
  );

  act(() => {
    validationHook.current.validate('');
  });

  expect(validationHook.current.validationError).toBe('Field is required');

  act(() => {
    validationHook.current.validate('Hello');
  });

  expect(validationHook.current.validationError).toBeUndefined();
});
