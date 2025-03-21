import {
  StudioResizableLayoutElement,
  type StudioResizableLayoutElementProps,
} from './StudioResizableLayoutElement/StudioResizableLayoutElement';
import type { StudioResizableOrientation } from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutContainer } from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutContext } from './context/StudioResizableLayoutContext';

type StudioResizableLayoutComponent = {
  Container: typeof StudioResizableLayoutContainer;
  Element: typeof StudioResizableLayoutElement;
  Context: typeof StudioResizableLayoutContext;
};

export const StudioResizableLayout: StudioResizableLayoutComponent = {
  Container: StudioResizableLayoutContainer,
  Element: StudioResizableLayoutElement,
  Context: StudioResizableLayoutContext,
};

export type { StudioResizableLayoutElementProps, StudioResizableOrientation };
