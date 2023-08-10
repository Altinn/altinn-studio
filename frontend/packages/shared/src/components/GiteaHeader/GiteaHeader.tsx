import React from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';

interface Props {
  org: string;
  app: string;
  menuOnlyHasRepository?: boolean;
  hasCloneModal?: boolean;
  extraPadding?: boolean;
}

export const GiteaHeader = ({
  org,
  app,
  menuOnlyHasRepository = false,
  hasCloneModal = false,
  extraPadding = false,
}: Props) => {
  return (
    <div className={classes.wrapper}>
      <div className={`${classes.contentWrapper} ${extraPadding && classes.extraPadding}`}>
        <VersionControlButtons data-testid='version-control-header' org={org} app={app} />
        <ThreeDotsMenu
          data-testid='three-dots-menu'
          onlyShowRepository={menuOnlyHasRepository}
          hasCloneModal={hasCloneModal}
        />
      </div>
    </div>
  );
};
