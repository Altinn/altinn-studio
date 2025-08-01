import React from 'react';
import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { getComponentHelperTextByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph, StudioPopover, StudioParagraph } from '@studio/components-legacy';
import { InformationIcon } from '@studio/icons';

export type InformationPanelProvidedProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  componentTitle: string;
  componentType: ComponentType | CustomComponentType;
};

export const InformationPanelComponent = ({
  isOpen,
  onOpen,
  onClose,
  componentTitle,
  componentType,
}: InformationPanelProvidedProps) => {
  const { t } = useTranslation();
  return (
    <StudioPopover open={isOpen} onClose={onClose} portal placement='right'>
      <StudioPopover.Trigger size='small' onClick={onOpen} variant='tertiary'>
        <InformationIcon />
      </StudioPopover.Trigger>
      <StudioPopover.Content>
        <div className={classNames(classes.informationPanelHeader)}>
          <StudioLabelAsParagraph size='small'>{componentTitle}</StudioLabelAsParagraph>
        </div>
        <div className={classNames(classes.informationPanelText)}>
          <StudioParagraph size='small'>
            {getComponentHelperTextByComponentType(componentType, t)}
          </StudioParagraph>
        </div>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
