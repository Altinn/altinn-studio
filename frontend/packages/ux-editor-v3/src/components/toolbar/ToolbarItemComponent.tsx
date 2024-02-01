import type { MouseEvent } from 'react';
import React from 'react';
import classes from './ToolbarItemComponent.module.css';
import { StudioButton } from '@studio/components';
import { InformationIcon } from '@navikt/aksel-icons';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'app-shared/types/ComponentType';

export interface IToolbarItemProvidedProps {
  componentType: ComponentType;
  onClick: (type: ComponentType, event: MouseEvent) => void;
  thirdPartyLabel?: string;
  icon?: string | React.ComponentType;
}

export const ToolbarItemComponent = (props: IToolbarItemProvidedProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.toolbarItem}>
      <div className={classes.componentIcon}>{props.icon && <props.icon />}</div>
      <div className={classes.componentLabel}>
        {props.thirdPartyLabel == null
          ? getComponentTitleByComponentType(props.componentType, t)
          : props.thirdPartyLabel}
      </div>
      <div className={classes.componentHelpIcon}>
        <StudioButton
          onClick={(e) => props.onClick(props.componentType, e)}
          icon={<InformationIcon />}
          variant='tertiary'
          size='small'
        />
      </div>
    </div>
  );
};
