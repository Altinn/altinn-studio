import type { KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { addableComponentTypes } from '../../utils/newComponentUtils';
import type { AddableComponentType } from '../../utils/newComponentUtils';
import classes from './InsertPoint.module.css';

export type InsertPointProps = {
  isOpen: boolean;
  /** Shows the button at all times instead of only on hover, as at the end of the page. */
  isAlwaysVisible?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChooseType: (type: AddableComponentType) => void;
};

/** A place between components where a new component can be added. */
export function InsertPoint({
  isOpen,
  isAlwaysVisible,
  onOpen,
  onClose,
  onChooseType,
}: InsertPointProps): ReactElement {
  const { t } = useTranslation();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') onClose();
  };

  if (isOpen) {
    return (
      <div className={classes.componentList} onKeyDown={handleKeyDown}>
        <span className={classes.componentListTitle}>{t('app_builder.add_component')}</span>
        <div className={classes.componentTypes}>
          {addableComponentTypes.map((type, index) => (
            <StudioButton
              key={type}
              variant='secondary'
              data-size='sm'
              autoFocus={index === 0}
              onClick={() => onChooseType(type)}
            >
              {t(`ux_editor.component_title.${type}`)}
            </StudioButton>
          ))}
          <StudioButton variant='tertiary' data-size='sm' onClick={onClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(classes.insertPoint, { [classes.alwaysVisible]: isAlwaysVisible })}>
      <StudioButton
        variant='secondary'
        data-size='sm'
        icon={<PlusIcon />}
        className={classes.addButton}
        title={t('app_builder.add_component_here')}
        aria-label={t('app_builder.add_component_here')}
        onClick={onOpen}
      />
    </div>
  );
}
