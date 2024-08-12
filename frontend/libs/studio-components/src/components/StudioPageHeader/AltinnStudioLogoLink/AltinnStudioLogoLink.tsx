import React from 'react';
import classes from './AltinnStudioLogoLink.module.css';
import { AltinnStudioLogo } from './AltinnStudioLogo';
import { Paragraph } from '@digdir/design-system-react';
import { Link } from '@digdir/designsystemet-react';

export type AltinnStudioLogoLinkProps = {
  title?: string;
  showOnlyLogo?: boolean;
};

export const AltinnStudioLogoLink = ({
  title,
  showOnlyLogo,
}: AltinnStudioLogoLinkProps): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <Link href='/'>
        <AltinnStudioLogo showOnlyLogo={showOnlyLogo} />
      </Link>
      {title && !showOnlyLogo && (
        <Paragraph size='medium' className={classes.titleText}>
          <span className={classes.slash}>/</span>
          {title}
        </Paragraph>
      )}
    </div>
  );
};
