import { useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading, StudioParagraph } from '@designer/components';
import { FeatureFlag, useFeatureFlag } from '@designer/feature-flags';
import { addableComponentGroups, flaggedComponentTypes } from '../../utils/newComponentUtils';
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
  const isLikertOn = useFeatureFlag(FeatureFlag.AppBuilderLikert);
  // The type the pointer is over or that has focus, so its line says what it is for.
  const [describedType, setDescribedType] = useState<AddableComponentType>();
  const isOffered = (type: AddableComponentType): boolean =>
    isLikertOn || !flaggedComponentTypes.includes(type);

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
        {/*
          One place for every type, with room for two lines kept free, so nothing moves while the
          pointer goes from one button to the next. A line under each group moved the buttons
          under the pointer, and a click could land on another type than the one aimed at.
        */}
        <p id='add-component-description' className={classes.description} aria-live='polite'>
          {describedType && (
            <>
              <b>{t(`app_builder.component_type.${describedType}`)}:</b>{' '}
              {t(`app_builder.component_description.${describedType}`)}
            </>
          )}
        </p>
      </div>
      {groups.map((group, groupIndex) => (
        <div key={group} className={classes.group} role='group' aria-labelledby={`add-${group}`}>
          <span id={`add-${group}`} className={classes.groupName}>
            {t(`app_builder.add_component.group.${group}`)}
          </span>
          <div className={classes.types}>
            {(addableComponentGroups[group] as readonly AddableComponentType[])
              .filter(isOffered)
              .map((type, typeIndex) => (
                <StudioButton
                  key={type}
                  variant='secondary'
                  data-size='sm'
                  // The box opens because the user asked for it, so its first choice takes focus.
                  autoFocus={groupIndex === 0 && typeIndex === 0}
                  aria-describedby='add-component-description'
                  onMouseEnter={() => setDescribedType(type)}
                  onFocus={() => setDescribedType(type)}
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
