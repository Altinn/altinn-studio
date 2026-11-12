import type { FieldDescriptionProps } from '@digdir/designsystemet-react';
import { forwardRef } from 'react';
import { Field } from '@digdir/designsystemet-react';

export type StudioDescriptionProps = FieldDescriptionProps;

const Description = forwardRef<HTMLParagraphElement, StudioDescriptionProps>((props, ref) => (
  <Field.Description {...props} ref={ref} />
));
Description.displayName = 'Studio.Description';

export { Description };
