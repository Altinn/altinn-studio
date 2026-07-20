import React from 'react';
import { useAppContext, useConfigurationMode } from '../../hooks';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';

import classes from './Elements.module.css';

import { StudioButton, StudioHeading } from '@studio/components';
import { SidebarLeftIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '@digdir/designsystemet-react';

export interface ElementsProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Elements = ({ collapsed, onCollapseToggle }: ElementsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { selectedFormLayoutName } = useAppContext();
  const configToolbarMode = useConfigurationMode();

  const hideComponents =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  const shouldShowConfPageToolbar: boolean = Boolean(configToolbarMode);

  if (collapsed) {
    return <TogglePanelButton onClick={onCollapseToggle} isCollapsed={collapsed} />;
  }

  return (
    <div className={classes.root}>
      <div className={classes.componentsHeader}>
        <StudioHeading data-size='2xs'>{t('left_menu.components')}</StudioHeading>
        <TogglePanelButton onClick={onCollapseToggle} isCollapsed={collapsed} />
      </div>
      {hideComponents ? (
        <Paragraph className={classes.noPageSelected} size='small'>
          {t('left_menu.no_components_selected')}
        </Paragraph>
      ) : shouldShowConfPageToolbar ? (
        <ConfPageToolbar confPageType={configToolbarMode} />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};

type TogglePanelButtonProps = {
  onClick: () => void;
  isCollapsed: boolean;
};

const TogglePanelButton = ({ onClick, isCollapsed }: TogglePanelButtonProps) => {
  const { t } = useTranslation();
  const title = isCollapsed ? t('left_menu.open_components') : t('left_menu.close_components');

  return (
    <StudioButton
      variant='tertiary'
      data-color='neutral'
      onClick={onClick}
      title={title}
      icon={<SidebarLeftIcon />}
      className={isCollapsed ? classes.collapsedPanel : undefined}
    />
  );
};
