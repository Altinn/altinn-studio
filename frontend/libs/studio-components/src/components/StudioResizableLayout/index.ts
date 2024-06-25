import {
  StudioResizableLayoutElement,
  type StudioResizableLayoutElementProps,
} from './StudioResizableLayoutContainer/StudioResizableLayoutElement';
import {
  StudioResizableLayoutContext,
  StudioResizableLayoutContainer,
} from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';

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

export type {
  StudioResizableLayoutElementProps as StudioResizableLayoutContainerProps,
  StudioResizableLayoutContext,
};
