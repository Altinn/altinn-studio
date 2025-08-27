import React from 'react';
import classes from './InformationPanelComponent.module.css';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { getComponentHelperTextByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph } from 'libs/studio-components-legacy/src';
import { StudioPopover, StudioParagraph } from 'libs/studio-components/src';
import { InformationIcon } from 'libs/studio-icons/src';

export type InformationPanelProvidedProps = {
  componentTitle: string;
  componentType: ComponentType | CustomComponentType;
};

export const InformationPanelComponent = ({
  componentTitle,
  componentType,
}: InformationPanelProvidedProps) => {
  const { t } = useTranslation();
  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger variant='tertiary'>
        <InformationIcon />
      </StudioPopover.Trigger>
      <StudioPopover placement='right'>
        <StudioLabelAsParagraph className={classes.informationPanelHeader} size='small'>
          {componentTitle}
        </StudioLabelAsParagraph>
        <StudioParagraph spacing>
          {getComponentHelperTextByComponentType(componentType, t)}
        </StudioParagraph>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
