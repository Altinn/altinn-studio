import { renderHook } from '@testing-library/react';
import { useStudioResizableLayoutFunctions } from './useStudioResizableFunctions';
import { horizontal } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';

describe('useStudioResizableLayoutFunctions', () => {
  let setContainerSize: jest.Mock;
  let elementRefs: React.MutableRefObject<HTMLDivElement[]>;
  let children: any[];

  beforeEach(() => {
    setContainerSize = jest.fn();
    elementRefs = {
      current: [document.createElement('div'), document.createElement('div')],
    };
    children = [
      { props: { collapsed: false, minimumSize: 0, maximumSize: 100, collapsedSize: 0 } },
      { props: { collapsed: false, minimumSize: 0, maximumSize: 100, collapsedSize: 0 } },
    ];
  });

  it('should return resizeTo and resizeDelta functions', () => {
    const { result } = renderFunctionsHook(elementRefs, children, setContainerSize);

    expect(result.current).toHaveProperty('resizeTo');
    expect(result.current).toHaveProperty('resizeDelta');
  });

  it('should call setContainerSize when resizeTo is called', () => {
    const { result } = renderFunctionsHook(elementRefs, children, setContainerSize);

    result.current.resizeTo(0, 100);
    expect(setContainerSize).toHaveBeenCalled();
  });

  it('should call resizeTo with correct parameters when resizeDelta is called', () => {
    const { result } = renderFunctionsHook(elementRefs, children, setContainerSize);

    result.current.resizeDelta(1, 100);
    expect(setContainerSize).toHaveBeenCalled();
  });

  it('should not resize when either element is collapsed', () => {
    const { result } = renderFunctionsHook(
      elementRefs,
      { ...children, 0: { ...children[0], props: { ...children[0].props, collapsed: true } } },
      setContainerSize,
    );
    result.current.resizeTo(0, 100);
    expect(setContainerSize).not.toHaveBeenCalled();
  });
});

function renderFunctionsHook(
  elementRefs,
  children: any[],
  setContainerSize: jest.Mock<any, any, any>,
): { result: any } {
  return renderHook(() =>
    useStudioResizableLayoutFunctions(horizontal, elementRefs, children, setContainerSize),
  );
}
