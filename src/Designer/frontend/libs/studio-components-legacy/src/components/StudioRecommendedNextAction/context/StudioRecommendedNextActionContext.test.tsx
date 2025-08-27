import { act, renderHook } from '@testing-library/react';
import {
  StudioRecommendedNextActionContextProvider,
  useStudioRecommendedNextActionContext,
} from '@studio/components-legacy';
import React from 'react';

describe('StudioRecommendedNextActionContext', () => {
  it('should return true only for added action ids', () => {
    const { result } = renderHook(useStudioRecommendedNextActionContext, {
      wrapper: hookWrapper,
    });
    act(() => {
      result.current.addAction('actionId');
    });
    expect(result.current.shouldDisplayAction('actionId')).toBe(true);
    expect(result.current.shouldDisplayAction('actionId2')).toBe(false);
  });

  it('should not return true for actions after they are removed', () => {
    const { result } = renderHook(useStudioRecommendedNextActionContext, {
      wrapper: hookWrapper,
    });
    act(() => {
      result.current.addAction('actionId');
    });
    expect(result.current.shouldDisplayAction('actionId')).toBe(true);
    act(() => {
      result.current.removeAction('actionId');
    });
    expect(result.current.shouldDisplayAction('actionId')).toBe(false);
  });

  it('should throw an error if the context is not wrapped in a provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(useStudioRecommendedNextActionContext);
    }).toThrow(Error);
  });

  const hookWrapper = ({ children }) => {
    return (
      <StudioRecommendedNextActionContextProvider>
        {children}
      </StudioRecommendedNextActionContextProvider>
    );
  };
});
