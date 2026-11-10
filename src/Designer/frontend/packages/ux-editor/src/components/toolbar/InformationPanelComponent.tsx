import classes from './InformationPanelComponent.module.css';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import { getComponentHelperTextByComponentType } from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { StudioPopover, StudioParagraph, StudioLabelAsParagraph } from '@studio/components';
import { InformationIcon } from '@studio/icons';

export type InformationPanelProvidedProps = {
  componentTitle: string;
  componentType: ComponentType | ComponentPreset;
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
        <StudioLabelAsParagraph className={classes.informationPanelHeader}>
          {componentTitle}
        </StudioLabelAsParagraph>
        <StudioParagraph spacing>
          {getComponentHelperTextByComponentType(componentType, t)}
        </StudioParagraph>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
