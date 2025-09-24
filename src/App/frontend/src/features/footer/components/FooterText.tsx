import React from 'react';

import { Lang } from 'src/features/language/Lang';
import type { IFooterBaseComponent } from 'src/features/footer/types';

export interface IFooterTextComponent extends IFooterBaseComponent<'Text'> {
  title: string;
}

export const FooterText = ({ title }: IFooterTextComponent) => (
  <span>
    <Lang id={title} />
  </span>
);
