import {
  StudioResizableLayoutElement,
  type StudioResizableLayoutElementProps,
} from './StudioResizableLayoutElement/StudioResizableLayoutElement';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutContext } from './context/StudioResizableLayoutContext';

type StudioResizableLayoutComponent = {
  Element: typeof StudioResizableLayoutElement;
  Container: typeof StudioResizableLayoutContainer;
  Context: typeof StudioResizableLayoutContext;
};

export const StudioResizableLayout: StudioResizableLayoutComponent = {
  Element: StudioResizableLayoutElement,
  Container: StudioResizableLayoutContainer,
  Context: StudioResizableLayoutContext,
};

export type { StudioResizableLayoutElementProps as StudioResizableLayoutContainerProps };
