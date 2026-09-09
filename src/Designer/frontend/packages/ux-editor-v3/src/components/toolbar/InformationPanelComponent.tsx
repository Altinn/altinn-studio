import classNames from 'classnames';
import classes from './InformationPanelComponent.module.css';
import type { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../utils/language';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph, StudioParagraph, StudioPopover } from '@studio/components';
import { InformationIcon } from '@studio/icons';

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
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger onClick={onOpen} variant='tertiary' icon={<InformationIcon />} />
      <StudioPopover open={isOpen} onClose={onClose} placement='right'>
        <div className={classNames(classes.informationPanelHeader)}>
          <StudioLabelAsParagraph>
            {getComponentTitleByComponentType(selectedComponent, t)}
          </StudioLabelAsParagraph>
        </div>
        <div className={classNames(classes.informationPanelText)}>
          <StudioParagraph data-size='sm'>
            {getComponentHelperTextByComponentType(selectedComponent, t)}
          </StudioParagraph>
        </div>
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};
