import React from 'react';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { createFooterComponent } from 'src/features/footer';
import classes from 'src/features/footer/Footer.module.css';
import type { IFooterLayout } from 'src/features/footer/types';

export const Footer = () => {
  const footerLayout: IFooterLayout | null = useAppSelector((state) => state.footerLayout.footerLayout);

  const components = React.useMemo(
    () => footerLayout?.footer.map((props) => createFooterComponent(props)),
    [footerLayout],
  );

  if (!components) {
    return null;
  }

  return <footer className={classes.footer}>{components.map((component) => component.render())}</footer>;
};
