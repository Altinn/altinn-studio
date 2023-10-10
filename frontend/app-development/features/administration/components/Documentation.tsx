import React from 'react';
import classes from './Documentation.module.css';
import { Heading, Link, Paragraph } from '@digdir/design-system-react';
import { ExternalLinkIcon } from '@navikt/aksel-icons';

export const Documentation = () => {
  return (
    <div className={classes.documentation}>
      <Heading level={2} size='xxsmall' className={classes.heading}>
        Kom i gang
      </Heading>
      <Paragraph size='small' className={classes.content}>
        Som ny bruker av Altinn Studio kan det være vanskelig å komme i gang. Her har du en guide
        som skal hjelpe deg
      </Paragraph>
      <Link href='https://docs.altinn.studio/altinn-studio/' className={classes.guideLink}>
        <span>Les vår guide</span>
        <ExternalLinkIcon className={classes.guideLinkIcon} />
      </Link>
    </div>
  );
};
