import React from 'react';
import type { ReactElement } from 'react';
import { Paragraph, type ParagraphProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import classes from './StudioParagraph.module.css';
import cn from 'classnames';

export type StudioParagraphProps = WithoutAsChild<ParagraphProps> & {
  spacing?: boolean;
};
export function StudioParagraph({
  children,
  spacing,
  ...rest
}: StudioParagraphProps): ReactElement {
  const className = cn(rest.className, { [classes.spacing]: spacing });

  return (
    <Paragraph {...rest} className={className}>
      {children}
    </Paragraph>
  );
}
