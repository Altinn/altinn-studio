import React from 'react';
import classes from './GiteaHeader.module.css';
import { VersionControlButtons } from './VersionControlButtons';
import { ThreeDotsMenu } from './ThreeDotsMenu';

interface Props {
  /**
   * The name of the organisation
   */
  org: string;
  /**
   * The name of the app / repository
   */
  app: string;
  /**
   * Flag for if the three dots menu only should show the repository option. This is relevant for resourceadm
   */
  menuOnlyHasRepository?: boolean;
  /**
   * Flag for if the component has a clone modal. This is relevant for app-development
   */
  hasCloneModal?: boolean;
  /**
   * Flag for if the component needs extra padding. Relevant for resourceadm, as it is not using the AltinnHeader
   */
  extraPadding?: boolean;
}

/**
 * @component
 * @example
 *    <GiteaHeader
 *        org={org}
 *        app={app}
 *        menuOnlyHasRepository
 *        extraPadding
 *        hasCloneModal
 *    />
 *
 * @property {string}[org] - The name of the organisation
 * @property {string}[app] - The name of the app / repository
 * @property {boolean}[menuOnlyHasRepository] - Flag for if the three dots menu only should show the repository option. This is relevant for resourceadm
 * @property {boolean}[hasCloneModal] - Flag for if the component has a clone modal. This is relevant for app-development
 * @property {boolean}[extraPadding] - Flag for if the component needs extra padding. Relevant for resourceadm, as it is not using the AltinnHeader
 *
 * @returns {React.ReactNode} - The rendered Gitea header component
 */
export const GiteaHeader = ({
  org,
  app,
  menuOnlyHasRepository = false,
  hasCloneModal = false,
  extraPadding = false,
}: Props): React.ReactNode => {
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
