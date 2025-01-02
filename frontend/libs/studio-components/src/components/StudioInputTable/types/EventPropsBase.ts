// import type { EventPropName } from './EventPropName';

// export type EventPropsBase = Record<EventPropName, any>;

export type EventPropsBase<BlurInput, FocusInput, ChangeInput> = {
  onBlur?: (input: BlurInput) => void;
  onFocus?: (input: FocusInput) => void;
  onChange?: (input: ChangeInput) => void;
};
