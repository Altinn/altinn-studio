import React from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';

interface Props {
  org: string;
  app: string;
  menuOnlyHasRepository?: boolean;
  hasCloneModal?: boolean;
}

export const GiteaHeader = ({
  org,
  app,
  menuOnlyHasRepository = false,
  hasCloneModal = false,
}: Props) => {
  return (
    <div className={classes.wrapper}>
      <VersionControlButtons data-testid='version-control-header' org={org} app={app} />
      <ThreeDotsMenu
        data-testid='three-dots-menu'
        onlyShowRepository={menuOnlyHasRepository}
        hasCloneModal={hasCloneModal}
      />
    </div>
  );
};
