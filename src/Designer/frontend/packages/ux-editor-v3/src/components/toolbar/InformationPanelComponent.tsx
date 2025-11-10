import React from 'react';
import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { StudioPopover } from '@studio/components-legacy';
import { StudioLabelAsParagraph } from '@studio/components';
import { InformationIcon } from '@studio/icons';
import { Paragraph } from '@digdir/designsystemet-react';

export type InformationPanelProvidedProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  selectedComponent: ComponentTypeV3;
};

export const InformationPanelComponent = ({
  isOpen,
  onOpen,
  onClose,
  selectedComponent,
}: InformationPanelProvidedProps) => {
  const { t } = useTranslation();
  return (
    <StudioPopover open={isOpen} onClose={onClose} placement='right'>
      <StudioPopover.Trigger size='small' onClick={onOpen} variant='tertiary'>
        <InformationIcon />
      </StudioPopover.Trigger>
      <StudioPopover.Content>
        <div className={classNames(classes.informationPanelHeader)}>
          <StudioLabelAsParagraph>
            {getComponentTitleByComponentType(selectedComponent, t)}
          </StudioLabelAsParagraph>
        </div>
        <div className={classNames(classes.informationPanelText)}>
          <Paragraph size='small'>
            {getComponentHelperTextByComponentType(selectedComponent, t)}
          </Paragraph>
        </div>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
