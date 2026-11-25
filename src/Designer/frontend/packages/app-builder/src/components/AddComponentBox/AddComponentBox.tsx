import type { KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading, StudioParagraph } from '@designer/components';
import { addableComponentGroups } from '../../utils/newComponentUtils';
import type { AddableComponentGroup, AddableComponentType } from '../../utils/newComponentUtils';
import classes from './AddComponentBox.module.css';

export type AddComponentBoxProps = {
  /** Says where the new component goes, such as after the selected component. */
  placementText: string;
  onChooseType: (type: AddableComponentType) => void;
  onCancel: () => void;
};

const groups = Object.keys(addableComponentGroups) as AddableComponentGroup[];

/** Lets the user choose what to add, grouped as texts, questions and groups. */
export function AddComponentBox({
  placementText,
  onChooseType,
  onCancel,
}: AddComponentBoxProps): ReactElement {
  const { t } = useTranslation();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <div className={classes.addComponentBox} data-size='sm' onKeyDown={handleKeyDown}>
      <div>
        <StudioHeading level={2} data-size='xs'>
          {t('app_builder.add_component')}
        </StudioHeading>
        <StudioParagraph data-size='sm' className={classes.placement}>
          {placementText}
        </StudioParagraph>
      </div>
      {groups.map((group, groupIndex) => (
        <div key={group} className={classes.group} role='group' aria-labelledby={`add-${group}`}>
          <span id={`add-${group}`} className={classes.groupName}>
            {t(`app_builder.add_component.group.${group}`)}
          </span>
          <div className={classes.types}>
            {addableComponentGroups[group].map((type, typeIndex) => (
              <StudioButton
                key={type}
                variant='secondary'
                data-size='sm'
                // The box opens because the user asked for it, so its first choice takes focus.
                autoFocus={groupIndex === 0 && typeIndex === 0}
                onClick={() => onChooseType(type)}
              >
                {t(`app_builder.component_type.${type}`)}
              </StudioButton>
            ))}
          </div>
        </div>
      ))}
      <div>
        <StudioButton variant='tertiary' data-size='sm' onClick={onCancel}>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </div>
  );
}
