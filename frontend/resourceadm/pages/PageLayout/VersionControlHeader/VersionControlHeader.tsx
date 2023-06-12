import React from 'react';
import classes from './VersionControlHeader.module.css';
import { BranchingIcon } from '@navikt/aksel-icons';
import { ThreeDotsMenu } from './ThreeDotsMenu/ThreeDotsMenu';
import { VersionControlButtons } from './VersionControlButtons/';

/**
 * Displays the version control menu header
 */
export const VersionControlHeader = () => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.leftWrapepr}>
        <BranchingIcon title='Branch icon' className={classes.branchIcon} />
      </div>
      <div className={classes.rightWrapper}>
        <VersionControlButtons />
        <ThreeDotsMenu />
      </div>
    </div>
  );
};
