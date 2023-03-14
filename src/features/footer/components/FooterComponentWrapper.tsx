import React from 'react';

import classes from 'src/features/footer/components/FooterComponentWrapper.module.css';
import type { IFooterBaseComponent, IFooterComponentType } from 'src/features/footer/types';

interface IFooterComponentWrapper {
  props: IFooterBaseComponent<IFooterComponentType>;
  childRenderer: (props: IFooterBaseComponent<IFooterComponentType>) => JSX.Element | null;
}

export const FooterComponentWrapper = ({ props, childRenderer }: IFooterComponentWrapper) => (
  <div className={classes.wrapper}>{React.createElement(childRenderer, props)}</div>
);
