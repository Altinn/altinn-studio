import React, { forwardRef } from 'react';
import type { ReactElement, Ref, ReactNode } from 'react';
import { Fieldset } from '@digdir/designsystemet-react';
import type { FieldsetProps } from '@digdir/designsystemet-react';
import classes from './StudioFieldset.module.css';
import cn from 'classnames';

export type StudioFieldsetProps = FieldsetProps & {
  legend?: ReactNode;
  description?: ReactNode;
};

function StudioFieldset(
  { children, legend, description, className: givenClass, ...rest }: StudioFieldsetProps,
  ref: Ref<HTMLFieldSetElement>,
): ReactElement {
  const className = cn(classes.fieldset, givenClass);
  return (
    <Fieldset className={className} {...rest} ref={ref}>
      <Fieldset.Legend>
        <span>{legend}</span>
      </Fieldset.Legend>
      {description && <Fieldset.Description>{description}</Fieldset.Description>}
      {children}
    </Fieldset>
  );
}
const ForwardedStudioFieldset = forwardRef(StudioFieldset);

export { ForwardedStudioFieldset as StudioFieldset };
