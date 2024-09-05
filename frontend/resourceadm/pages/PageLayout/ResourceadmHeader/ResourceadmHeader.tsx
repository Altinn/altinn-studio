import React, { useContext } from 'react';
import classes from './ResourceadmHeader.module.css';
import { useNavigate } from 'react-router-dom';
import { getOrgNameByUsername } from '../../../utils/userUtils';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { useUrlParams } from '../../../hooks/useUrlParams';
import {
  StudioPageHeader,
  StudioProfileMenu,
  type StudioProfileMenuItem,
  useMediaQuery,
  StudioAvatar,
} from '@studio/components';
import { repositoryOwnerPath } from 'app-shared/api/paths';
import { type Organization } from 'app-shared/types/Organization';
import { useTranslation } from 'react-i18next';
import { type SelectedContextType, HeaderContext } from 'resourceadm/context/HeaderContext';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useLogoutMutation } from 'app-shared/hooks/mutations/useLogoutMutation';

export const ResourceadmHeader = () => {
  const { org } = useUrlParams();
  const selectedContext = org;

  const { selectableOrgs } = useContext(HeaderContext);

  return (
    <StudioPageHeader>
      <StudioPageHeader.Main>
        <StudioPageHeader.Left title={getOrgNameByUsername(selectedContext, selectableOrgs)} />
        <StudioPageHeader.Right>
          <ResourceadmHeaderMenu />
        </StudioPageHeader.Right>
      </StudioPageHeader.Main>
      <StudioPageHeader.Sub>
        <GiteaHeader menuOnlyHasRepository rightContentClassName={classes.extraPadding} />
      </StudioPageHeader.Sub>
    </StudioPageHeader>
  );
};

const ResourceadmHeaderMenu = () => {
  const { t } = useTranslation();
  const shouldHideButtonText = useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org: selectedContext } = useUrlParams();
  const { mutate: logout } = useLogoutMutation();
  const { user, selectableOrgs } = useContext(HeaderContext);
  const navigate = useNavigate();

  const getTriggerButtonText = (): string => {
    if (shouldHideButtonText) return;

    const username = user.full_name || user.login;

    return t('shared.header_user_for_org', {
      user: username,
      org: getOrgNameByUsername(selectedContext, selectableOrgs),
    });
  };

  const handleSetSelectedContext = (context: string | SelectedContextType) => {
    navigate(`/${context}/${context}-resources`);
  };

  const getRepoPath = () => {
    return repositoryOwnerPath(selectedContext);
  };

  const selectableOrgMenuItems: StudioProfileMenuItem[] =
    selectableOrgs?.map((selectableOrg: Organization) => ({
      action: { type: 'button', onClick: () => handleSetSelectedContext(selectableOrg.username) },
      itemName: selectableOrg?.full_name || selectableOrg.username,
      isActive: selectedContext === selectableOrg.username,
    })) ?? [];

  const giteaMenuItem: StudioProfileMenuItem = {
    action: { type: 'link', href: getRepoPath() },
    itemName: t('shared.header_go_to_gitea'),
  };

  const logOutMenuItem: StudioProfileMenuItem = {
    action: { type: 'button', onClick: logout },
    itemName: t('shared.header_logout'),
  };

  return (
    <StudioProfileMenu
      triggerButtonText={getTriggerButtonText()}
      ariaLabelTriggerButton={getTriggerButtonText()}
      color='dark'
      variant='regular'
      profileImage={
        <StudioAvatar
          imageDetails={
            user?.avatar_url && {
              src: user.avatar_url,
              alt: t('general.profile_icon'),
              title: t('shared.header_profile_icon_text'),
            }
          }
        />
      }
      profileMenuItems={[...selectableOrgMenuItems, giteaMenuItem, logOutMenuItem]}
    />
  );
};
