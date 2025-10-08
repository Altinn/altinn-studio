import React from 'react';

import { useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { AltinnLogo, LogoColor } from 'src/components/logo/AltinnLogo';
import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FooterEmail } from 'src/features/footer/components/FooterEmail';
import { FooterLink } from 'src/features/footer/components/FooterLink';
import { FooterPhone } from 'src/features/footer/components/FooterPhone';
import { FooterText } from 'src/features/footer/components/FooterText';
import classes from 'src/features/footer/Footer.module.css';
import type { IFooterComponent, IFooterComponentMap } from 'src/features/footer/types';

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

  const footerElements = data?.footer;
  if (!footerElements && !shouldUseOrgLogo) {
    return null;
  }

  return (
    <footer className={cn(classes.footer, { [classes.columnLayout]: shouldUseOrgLogo })}>
      <div className={classes.elements}>
        {footerElements?.map((el) => (
          <FooterComponent
            key={el.title}
            element={el}
          />
        ))}
      </div>
      {shouldUseOrgLogo && (
        <>
          {!!footerElements && <hr className={classes.separator} />}
          <AltinnLogo color={LogoColor.blueDarker} />
        </>
      )}
    </footer>
  );
};

function FooterComponent({ element }: { element: IFooterComponent<keyof IFooterComponentMap> }) {
  switch (element.type) {
    case 'Email':
      return <FooterEmail {...element} />;
    case 'Link':
      return <FooterLink {...element} />;
    case 'Phone':
      return <FooterPhone {...element} />;
    case 'Text':
      return <FooterText {...element} />;
    default:
      return null;
  }
}
