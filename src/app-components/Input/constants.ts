import type { HTMLInputTypeAttribute } from 'react';

export type InputType = Extract<
  HTMLInputTypeAttribute,
  'email' | 'number' | 'password' | 'search' | 'tel' | 'text' | 'url'
>;

export const EXTERNAL_INPUT_TYPE = ['text', 'search'] satisfies InputType[];
