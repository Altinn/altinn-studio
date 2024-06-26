import React from 'react';
import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentType } from 'app-shared/types/ComponentType';
import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph, StudioPopover } from '@studio/components';
import { InformationIcon } from '@studio/icons';
import { Paragraph } from '@digdir/design-system-react';

export interface IInformationPanelProvidedProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  selectedComponent: ComponentType;
}

export const InformationPanelComponent = ({
  isOpen,
  onOpen,
  onClose,
  selectedComponent,
}: IInformationPanelProvidedProps) => {
  const { t } = useTranslation();
  return (
    <StudioPopover open={isOpen} onClose={onClose} placement='right'>
      <StudioPopover.Trigger size='small' onClick={onOpen} variant='tertiary'>
        <InformationIcon />
      </StudioPopover.Trigger>
      <StudioPopover.Content>
        <div className={classNames(classes.informationPanelHeader)}>
          <StudioLabelAsParagraph size='small'>
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
