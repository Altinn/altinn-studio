import React from 'react';
import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { InformationSquareFillIcon } from '@navikt/aksel-icons';
import { Popover } from '@mui/material';

import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { useTranslation } from 'react-i18next';

export interface IInformationPanelProvidedProps {
  anchorElement: any;
  selectedComponent: ComponentType;
  informationPanelOpen: boolean;
  onClose: () => void;
  thirdPartyLibrary?: boolean;
}

export const InformationPanelComponent = ({
  anchorElement,
  informationPanelOpen,
  onClose,
  selectedComponent,
  thirdPartyLibrary,
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
      <div className={classNames(classes.informationPanelText)}>
        <InformationSquareFillIcon className={classes.informationIcon} />
        {!thirdPartyLibrary
          ? t('ux_editor.information_altinn_library')
          : t('ux_editor.information_third_party_library')}
      </div>
      <div className={classNames(classes.informationPanelLink)}>
        <a
          href='https://docs.altinn.studio/technology/solutions/altinn-studio/designer/functional/build-app/ui-designer/components/'
          target='_blank'
          rel='noopener noreferrer'
        >
          {t('ux_editor.information_more_info_link')}
        </a>
      </div>
    </Popover>
  );
};
