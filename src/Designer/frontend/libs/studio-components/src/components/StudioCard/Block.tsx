import React, { forwardRef } from 'react';
import type { CardBlockProps } from '@digdir/designsystemet-react';
import { Card } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type BlockProps = WithoutAsChild<CardBlockProps>;

export const Block = forwardRef<HTMLDivElement, BlockProps>((props, ref) => {
  return <Card.Block {...props} ref={ref} />;
});

Block.displayName = 'StudioCard.Block';
