import type { HTMLAttributes, ReactNode } from 'react';
import type { TextareaProps, TextfieldProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from './WithoutAsChild';

export type SharedTextInputProps<E extends HTMLTextAreaElement | HTMLInputElement> =
  HTMLAttributes<E> & WithoutAsChild<DesignSystemProps<E>> & AdditionalProps;

type DesignSystemProps<E> = E extends HTMLInputElement
  ? TextfieldProps
  : E extends HTMLTextAreaElement
    ? TextareaProps
    : never;

export type AdditionalProps = {
  errorAfterBlur?: ReactNode;
  withAsterisk?: boolean;
};
