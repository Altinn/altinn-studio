import { useContext } from 'react';
import { StudioResizableLayoutContext } from '../StudioResizableLayoutContainer/StudioResizableLayoutRoot';

export const useStudioResizableLayoutContext = () => useContext(StudioResizableLayoutContext);
