import {
  StudioResizableLayoutContainer,
  type StudioResizableLayoutContainerProps,
} from './StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import { StudioResizableLayoutRoot } from './StudioResizableLayoutContainer/StudioResizableLayoutRoot';

type StudioResizableLayoutComponent = {
  Container: typeof StudioResizableLayoutContainer;
  Root: typeof StudioResizableLayoutRoot;
};

export const StudioResizableLayout: StudioResizableLayoutComponent = {
  Container: StudioResizableLayoutContainer,
  Root: StudioResizableLayoutRoot,
};

export type { StudioResizableLayoutContainerProps };
