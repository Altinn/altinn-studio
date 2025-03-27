import React from 'react';
import type { ReactElement } from 'react';
import { Paragraph, type ParagraphProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioParagraphProps = WithoutAsChild<ParagraphProps>;

export function StudioParagraph({
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioParagraphProps): ReactElement {
  return (
    <Paragraph {...rest} data-size={dataSize}>
      {children}
    </Paragraph>
  );
}
