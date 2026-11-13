export type EventProps<BlurInput, FocusInput, ChangeInput> = {
  onBlur?: (input: BlurInput) => void;
  onFocus?: (input: FocusInput) => void;
  onChange?: (input: ChangeInput) => void;
};
