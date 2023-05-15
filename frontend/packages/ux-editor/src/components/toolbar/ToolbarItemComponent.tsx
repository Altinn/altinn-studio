import React, { MouseEvent } from 'react';
import classes from './ToolbarItemComponent.module.css';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { InformationIcon } from '@navikt/aksel-icons';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { ComponentType } from '../index';

export interface IToolbarItemProvidedProps {
  componentType: ComponentType;
  onClick: (type: ComponentType, event: MouseEvent) => void
  thirdPartyLabel?: string;
  icon: string;
}

export const ToolbarItemComponent = (props: IToolbarItemProvidedProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.toolbarItem}>
      <div className={classes.componentIcon}>
        <i className={props.icon} />
      </div>
      <div className={classes.componentLabel}>
        {props.thirdPartyLabel == null
          ? getComponentTitleByComponentType(props.componentType, t)
          : props.thirdPartyLabel}
      </div>
      <div className={classes.componentHelpIcon}>
        <Button
          onClick={(e) => props.onClick(props.componentType, e)}
          icon={<InformationIcon />}
          variant={ButtonVariant.Quiet}
        />
      </div>
    </div>
  );
};
