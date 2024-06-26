import React from 'react';
import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { Popover } from '@mui/material';

import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { useTranslation } from 'react-i18next';

export interface IInformationPanelProvidedProps {
  anchorElement: any;
  selectedComponent: ComponentTypeV3;
  informationPanelOpen: boolean;
  onClose: () => void;
}

export const InformationPanelComponent = ({
  anchorElement,
  informationPanelOpen,
  onClose,
  selectedComponent,
}: IInformationPanelProvidedProps) => {
  const { t } = useTranslation();
  return (
    <Popover
      anchorEl={anchorElement}
      open={informationPanelOpen}
      onClose={onClose}
      PaperProps={{ square: true }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      classes={{ paper: classNames(classes.informationPanel) }}
    >
      <div className={classNames(classes.informationPanelHeader)}>
        {getComponentTitleByComponentType(selectedComponent, t)}
      </div>
      <div className={classNames(classes.informationPanelText)}>
        {getComponentHelperTextByComponentType(selectedComponent, t)}
      </div>
    </Popover>
  );
};
