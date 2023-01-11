import React from 'react';
import classNames from 'classnames';
import classes from './ToolbarItemComponent.module.css';
import type { IAppState } from '../../types/global';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { Helptext } from '@navikt/ds-icons';
import { getComponentTitleByComponentType } from '../../utils/language';
import { useSelector } from 'react-redux';

export interface IToolbarItemProvidedProps {
  componentType: string;
  onClick: any;
  thirdPartyLabel?: string;
  icon: string;
}

export const ToolbarItemComponent = (props: IToolbarItemProvidedProps) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  return (
    <div className={classes.toolbarItem}>
      <div className={classes.componentIcon}>
        <i className={classNames(classes.listComponentIcon, props.icon)} />
      </div>
      <div className={classes.componentLabel}>
        {props.thirdPartyLabel == null
          ? getComponentTitleByComponentType(props.componentType, language)
          : props.thirdPartyLabel}
      </div>
      <div className={classes.componentHelpIcon}>
        <Button
          onClick={(e: any) => props.onClick(props.componentType, e)}
          icon={<Helptext />}
          variant={ButtonVariant.Quiet}
        />
      </div>
    </div>
  );
};
