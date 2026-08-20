import type { FormFieldProps } from 'app-shared/components/FormField';
import { FormField as FF } from 'app-shared/components/FormField';
import { useLayoutSchemaQuery } from '../hooks/queries/useLayoutSchemaQuery';

import type { JSX } from 'react';

export const FormField = <T extends unknown, TT extends unknown>(
  props: FormFieldProps<T, TT>,
): JSX.Element => {
  const { layoutSchemaQuery } = useLayoutSchemaQuery();
  const { data: layoutSchema } = layoutSchemaQuery;
  return <FF schema={layoutSchema} {...props}></FF>;
};
