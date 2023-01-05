import React from 'react';
import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentTypes } from '..';
import { Divider } from 'app-shared/primitives';
import { InformationColored } from '@navikt/ds-icons';
import { Popover } from '@mui/material';
import { SearchField } from '@altinn/altinn-design-system';
import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType
} from '../../utils/language';

export interface IInformationPanelProvidedProps {
  language: any;
  anchorElement: any;
  selectedComponent: ComponentTypes;
  informationPanelOpen: boolean;
  onClose: () => void;
  thirdPartyLibrary?: boolean;
}

export const InformationPanelComponent = ({
  anchorElement,
  informationPanelOpen,
  language,
  onClose,
  selectedComponent,
  thirdPartyLibrary
}: IInformationPanelProvidedProps) => (
  <Popover
    anchorEl={anchorElement}
    open={informationPanelOpen}
    onClose={onClose}
    PaperProps={{ square: true }}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
    classes={{ paper: classNames(classes.informationPanel) }}
  >
    <SearchField id={'component-search'} placeholder={'Søk'} />
    <Divider />
    <div className={classNames(classes.informationPanelHeader)}>
      {getComponentTitleByComponentType(selectedComponent, language)}
    </div>
    <div className={classNames(classes.informationPanelText)}>
      {getComponentHelperTextByComponentType(selectedComponent, language)}
    </div>
    <div className={classNames(classes.informationPanelText)}>
      <InformationColored className={classes.informationIcon} />
      {!thirdPartyLibrary
        ? language['ux_editor.information_altinn_library']
        : language['ux_editor.information_third_party_library']}
    </div>
    <div className={classNames(classes.informationPanelLink)}>
      <a
        href='https://docs.altinn.studio/technology/solutions/altinn-studio/designer/functional/build-app/ui-designer/components/'
        target='_blank'
        rel='noopener noreferrer'
      >
        {language['ux_editor.information_more_info_link']}
      </a>
    </div>
  </Popover>
);
