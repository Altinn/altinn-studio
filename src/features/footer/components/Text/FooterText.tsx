import React from 'react';

import { Lang } from 'src/features/language/Lang';
import type { IFooterTextComponent } from 'src/features/footer/components/Text/types';

export const FooterText = ({ title }: IFooterTextComponent) => (
  <span>
    <Lang id={title} />
  </span>
);
