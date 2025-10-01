import React from 'react';

import cn from 'classnames';

import { AltinnLogo, LogoColor } from 'src/components/logo/AltinnLogo';
import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { FooterEmail } from 'src/features/footer/components/FooterEmail';
import { FooterLink } from 'src/features/footer/components/FooterLink';
import { FooterPhone } from 'src/features/footer/components/FooterPhone';
import { FooterText } from 'src/features/footer/components/FooterText';
import classes from 'src/features/footer/Footer.module.css';
import type { IFooterComponent, IFooterComponentMap } from 'src/features/footer/types';

export const Footer = () => {
  const data = window.AltinnAppData?.footerLayout;
  const application = useLaxApplicationMetadata();

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
