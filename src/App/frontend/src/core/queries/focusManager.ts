import { focusManager as tanStackFocusManager } from '@tanstack/react-query';

export const queryFocusManager = {
  isFocused: () => tanStackFocusManager.isFocused(),
  setFocused: (focused?: boolean) => tanStackFocusManager.setFocused(focused),
  subscribe: (listener: (focused: boolean) => void) => tanStackFocusManager.subscribe(listener),
};
