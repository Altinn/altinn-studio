import React from 'react';
import { renderHook } from '@testing-library/react';
import { useStudioResizableLayoutFunctions } from './useStudioResizableFunctions';
import { horizontal } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import type { StudioResizableLayoutElementProps } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';

type ResizableChildElement = React.ReactElement;
type HookReturn = ReturnType<typeof useStudioResizableLayoutFunctions>;
type ElementPropsLoose = Omit<StudioResizableLayoutElementProps, 'children'> & {
  children?: React.ReactNode;
};
const ResizableTestElement: React.JSXElementConstructor<ElementPropsLoose> = () => null;

const makeChild = (
  overrides: Partial<StudioResizableLayoutElementProps> = {},
): ResizableChildElement =>
  React.createElement(
    ResizableTestElement,
    {
      collapsed: false,
      minimumSize: 0,
      maximumSize: 100,
      collapsedSize: 0,
      ...overrides,
    },
    React.createElement('div'),
  );

describe('useStudioResizableLayoutFunctions', () => {
  let setContainerSize: jest.Mock<void, [number, number]>;
  let elementRefs: React.MutableRefObject<HTMLDivElement[]>;
  let children: ResizableChildElement[];

  beforeEach(() => {
    setContainerSize = jest.fn();
    elementRefs = {
      current: [document.createElement('div'), document.createElement('div')],
    };
    children = [makeChild(), makeChild()];
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
    const collapsedChildren: ResizableChildElement[] = [
      makeChild({ collapsed: true }),
      makeChild(),
    ];
    const { result } = renderFunctionsHook(elementRefs, collapsedChildren, setContainerSize);
    result.current.resizeTo(0, 100);
    expect(setContainerSize).not.toHaveBeenCalled();
  });
});

function renderFunctionsHook(
  elementRefs: React.MutableRefObject<HTMLDivElement[]>,
  children: ResizableChildElement[],
  setContainerSize: jest.Mock<void, [number, number]>,
): { result: { current: HookReturn } } {
  return renderHook(() =>
    useStudioResizableLayoutFunctions(horizontal, elementRefs, children, setContainerSize),
  );
}
