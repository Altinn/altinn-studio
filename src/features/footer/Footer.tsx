import React, { useMemo } from 'react';

import cn from 'classnames';

import { AltinnLogo, LogoColor } from 'src/components/logo/AltinnLogo';
import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { createFooterComponent } from 'src/features/footer';
import classes from 'src/features/footer/Footer.module.css';
import { useFooterLayout } from 'src/features/footer/FooterLayoutProvider';

export const Footer = () => {
  const footerLayout = useFooterLayout();
  const application = useLaxApplicationMetadata();
  const shouldUseOrgLogo = application !== ContextNotProvided && application.logo != null;

  const components = useMemo(() => footerLayout.map((props) => createFooterComponent(props)), [footerLayout]);
  if (!components.length && !shouldUseOrgLogo) {
    return null;
  }

  return (
    <footer className={cn(classes.footer, { [classes.columnLayout]: shouldUseOrgLogo })}>
      <div className={classes.elements}>{components.map((component) => component.render())}</div>
      {shouldUseOrgLogo && (
        <>
          {components.length > 0 && <hr className={classes.separator} />}
          <AltinnLogo color={LogoColor.blueDarker} />
        </>
      )}
    </footer>
  );
};
