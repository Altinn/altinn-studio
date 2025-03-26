import React from 'react';
import { Paragraph, ParagraphProps } from '@digdir/designsystemet-react';

export type StudioParagraphProps = ParagraphProps;

export const StudioParagraph = ({
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioParagraphProps) => {
  return (
    <Paragraph {...rest} data-size={dataSize}>
      {children}
    </Paragraph>
  );
};
