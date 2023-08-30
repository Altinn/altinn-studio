import React from 'react';

import cn from 'classnames';

import { AltinnLogo } from 'src/components/AltinnLogo';
import { createFooterComponent } from 'src/features/footer';
import classes from 'src/features/footer/Footer.module.css';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import type { IFooterLayout } from 'src/features/footer/types';

export const Footer = () => {
  const footerLayout: IFooterLayout | null = useAppSelector((state) => state.footerLayout.footerLayout);
  const useOrganisationLogo = useAppSelector((state) => state.applicationMetadata.applicationMetadata?.logo != null);

  const components = React.useMemo(
    () => footerLayout?.footer.map((props) => createFooterComponent(props)),
    [footerLayout],
  );

  if (!components && !useOrganisationLogo) {
    return null;
  }

  return (
    <footer className={cn(classes.footer, { [classes.columnLayout]: useOrganisationLogo })}>
      <div className={classes.elements}>{components?.map((component) => component.render())}</div>
      {useOrganisationLogo && (
        <>
          {components != null && <hr className={classes.separator} />}
          <AltinnLogo color={AltinnAppTheme.altinnPalette.primary.blueDarker} />
        </>
      )}
    </footer>
  );
};
