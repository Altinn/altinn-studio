import { BranchingIcon } from '@navikt/aksel-icons';
import { ThreeDotsMenu } from 'app-development/layout/AppBar/ThreeDotsMenu';
import { VersionControlHeader } from 'app-development/layout/version-control/VersionControlHeader';
import classes from './AltinnSubMenu.module.css';
import React from 'react';

export interface AltinnSubMenuProps {
  showVersionControlHeader: boolean;
  showThreeDotsMenu: boolean;
  showBranchingIcon: boolean;
}

export const AltinnSubMenu = ({
  showVersionControlHeader,
  showThreeDotsMenu,
  showBranchingIcon,
}: AltinnSubMenuProps) => {
  return (
    <div data-testid='altinn-sub-menu'>
      <div className={classes.subToolbar}>
        <div className={classes.leftContent} data-testid='branching-icon'>
          {showBranchingIcon && <BranchingIcon className={classes.branchIcon} />}
        </div>
        <div className={classes.rightContent}>
          {showVersionControlHeader && (
            <VersionControlHeader data-testid='version-control-header' />
          )}
          {showThreeDotsMenu && <ThreeDotsMenu data-testid='three-dots-menu' />}
        </div>
      </div>
    </div>
  );
};
