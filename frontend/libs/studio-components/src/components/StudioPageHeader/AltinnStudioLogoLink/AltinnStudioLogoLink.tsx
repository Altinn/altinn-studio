import React from 'react';
import classes from './AltinnStudioLogoLink.module.css';
import { AltinnStudioLogo } from './AltinnStudioLogo';
import { Paragraph } from '@digdir/design-system-react';
import { Link } from '@digdir/designsystemet-react';

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
