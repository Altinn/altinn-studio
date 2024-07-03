import React from 'react';
import classes from './AltinnStudioLogoLink.module.css';
import { AltinnStudioLogo } from './AltinnStudioLogo';
import { Link, Paragraph } from '@digdir/design-system-react';

export type AltinnStudioLogoLinkProps = {
  title?: string;
};

export const AltinnStudioLogoLink = ({ title }: AltinnStudioLogoLinkProps): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <Link href='/'>
        <AltinnStudioLogo />
      </Link>
      {title && (
        <Paragraph size='medium'>
          <span className={classes.slash}>/</span>
          {title}
        </Paragraph>
      )}
    </div>
  );
};
