import { BranchingIcon } from '@navikt/aksel-icons';
import { ThreeDotsMenu } from 'app-development/layout/AppBar/ThreeDotsMenu';
import { VersionControlHeader } from 'app-development/layout/version-control/VersionControlHeader';
import classes from './AltinnSubMenu.module.css';
import React from 'react';

export const AltinnSubMenu = () => {
  return (
    <div>
      <div className={classes.subToolbar}>
        <div className={classes.leftContent}>
          <BranchingIcon className={classes.branchIcon} />
        </div>
        <div className={classes.rightContent}>
          <VersionControlHeader />
          <ThreeDotsMenu />
        </div>
      </div>
    </div>
  );
};
