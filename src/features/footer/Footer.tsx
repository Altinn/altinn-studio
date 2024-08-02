import React from 'react';

import { useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { AltinnLogo, LogoColor } from 'src/components/logo/AltinnLogo';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { createFooterComponent } from 'src/features/footer';
import classes from 'src/features/footer/Footer.module.css';

export const Footer = () => {
  const { fetchFooterLayout } = useAppQueries();
  const { data, error: footerLayoutError } = useQuery({
    queryKey: ['fetchFooterLayout'],
    queryFn: fetchFooterLayout,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const application = useLaxApplicationMetadata();

  if (footerLayoutError) {
    return <DisplayError error={footerLayoutError} />;
  }

  const shouldUseOrgLogo = application !== ContextNotProvided && application.logoOptions != null;

  const components = data?.footer?.map((props) => createFooterComponent(props)) ?? [];
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
