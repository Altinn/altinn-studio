import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

// `size`/`customInput` are owned by the underlying field components, and the label/aria props are
// driven by the layout component itself. They are omitted here so spreading the config does not
// clash with the field's `size` prop or re-widen its `aria-label`/`aria-labelledby` union.
type OmittedFieldKeys = 'size' | 'customInput' | 'aria-label' | 'aria-labelledby' | 'label';
export type NumericConfig = Omit<NumericFormatProps, OmittedFieldKeys>;
export type PatternConfig = Omit<PatternFormatProps, OmittedFieldKeys>;

/** The resolved react-number-format config (i.e. the `formatting.number` part). */
export type NumberFormat = NumericConfig | PatternConfig;

// The pattern vs numeric variants are discriminated purely by the presence of the `format` property
// (numeric configs omit it; pattern configs require it). The guards are generic over the format pair
// so they narrow both the resolved config used by the component ({@link NumberFormat}, where
// `format` is a `string`) and the layout config used by the app (where `format` is an expression
// value). They only read whether `format` is set, never its type, so `T` is left unconstrained.
type WithFormat = { format: NonNullable<unknown> };

export const isPatternFormat = <T>(format: T | undefined): format is Extract<T, WithFormat> =>
  format ? (format as unknown as WithFormat).format !== undefined : false;

export const isNumberFormat = <T>(format: T | undefined): format is Exclude<T, WithFormat> =>
  format ? (format as unknown as WithFormat).format === undefined : false;
