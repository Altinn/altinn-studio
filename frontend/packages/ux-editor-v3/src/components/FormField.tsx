import React from 'react';
import type { FormFieldProps } from 'app-shared/components/FormField';
import { FormField as FF } from 'app-shared/components/FormField';
import { useLayoutSchemaQuery } from '../hooks/queries/useLayoutSchemaQuery';

export const FormField = <T extends unknown, TT extends unknown>(
  props: FormFieldProps<T, TT>,
): JSX.Element => {
  const [{ data: layoutSchema }] = useLayoutSchemaQuery();
  return <FF schema={layoutSchema} {...props}></FF>;
};
