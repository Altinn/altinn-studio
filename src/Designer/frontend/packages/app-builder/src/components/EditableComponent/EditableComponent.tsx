import { useState } from 'react';
import type { MouseEvent, PropsWithChildren, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton } from '@studio/components';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '@studio/icons';
import { INDICATOR_ATTRIBUTE, TEXT_KEY_ATTRIBUTE } from '../../constants';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import classes from './EditableComponent.module.css';

export type RequiredToggle = {
  isRequired: boolean;
  onToggle: () => void;
};

export type EditableComponentProps = PropsWithChildren<{
  componentId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (offset: number) => void;
  /** Asks the user what to delete; nothing is deleted until they confirm. */
  onDelete: () => void;
  /** Set when the component can be switched between required and optional on the canvas. */
  requiredToggle?: RequiredToggle;
}>;

/**
 * Wraps a component on the canvas. A transparent button covers the component, so clicks never reach
 * labels, inputs or buttons inside it. The first click selects the component; a click on a text in a
 * selected component opens the text editor over that text. A click on the "required" or "optional"
 * tag after the label switches between the two, whether the component is selected or not.
 */
export function EditableComponent({
  componentId,
  canMoveUp,
  canMoveDown,
  onMove,
  onDelete,
  requiredToggle,
  children,
}: EditableComponentProps): ReactElement {
  const { t } = useTranslation();
  const { selectedComponentId, selectComponent, startEditingText } = useCanvasState();
  const [isOverIndicator, setIsOverIndicator] = useState<boolean>(false);
  const isSelected = selectedComponentId === componentId;

  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    const document = event.currentTarget.ownerDocument;
    const isKeyboardClick = event.detail === 0;
    const isIndicatorClick =
      !isKeyboardClick &&
      Boolean(findAtPoint(document, event.clientX, event.clientY, indicatorSelector));
    if (requiredToggle && isIndicatorClick) {
      if (!isSelected) selectComponent(componentId);
      requiredToggle.onToggle();
      return;
    }
    if (!isSelected) {
      selectComponent(componentId);
      return;
    }
    const component = event.currentTarget.parentElement;
    const textElement = isKeyboardClick
      ? (component?.querySelector<HTMLElement>(textSelector) ?? null)
      : findAtPoint(document, event.clientX, event.clientY, textSelector);
    if (textElement) {
      startEditingText({
        textKey: textElement.getAttribute(TEXT_KEY_ATTRIBUTE),
        anchor: textElement,
      });
    }
  };

  const handleMouseMove = (event: MouseEvent<HTMLButtonElement>): void => {
    if (!requiredToggle) return;
    const indicator = findAtPoint(
      event.currentTarget.ownerDocument,
      event.clientX,
      event.clientY,
      indicatorSelector,
    );
    setIsOverIndicator(Boolean(indicator));
  };

  return (
    <div
      className={cn(classes.editableComponent, {
        [classes.selected]: isSelected,
        [classes.overIndicator]: isOverIndicator,
      })}
      data-component-id={componentId}
    >
      {children}
      <button
        type='button'
        className={classes.selectButton}
        aria-label={
          isSelected
            ? t('app_builder.edit_component_text', { componentId })
            : t('app_builder.select_component', { componentId })
        }
        aria-pressed={isSelected}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsOverIndicator(false)}
      />
      {isSelected && (
        <div
          className={classes.toolbar}
          role='toolbar'
          aria-label={t('app_builder.component_toolbar')}
        >
          {requiredToggle && (
            <StudioButton
              variant='tertiary'
              data-size='sm'
              aria-pressed={requiredToggle.isRequired}
              onClick={requiredToggle.onToggle}
            >
              {t('app_builder.required')}
            </StudioButton>
          )}
          <StudioButton
            variant='tertiary'
            data-size='sm'
            icon={<ArrowUpIcon />}
            title={t('app_builder.move_up')}
            aria-label={t('app_builder.move_up')}
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
          />
          <StudioButton
            variant='tertiary'
            data-size='sm'
            icon={<ArrowDownIcon />}
            title={t('app_builder.move_down')}
            aria-label={t('app_builder.move_down')}
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
          />
          <StudioButton
            variant='tertiary'
            data-size='sm'
            data-color='danger'
            icon={<TrashIcon />}
            title={t('general.delete')}
            aria-label={t('general.delete')}
            onClick={onDelete}
          />
        </div>
      )}
    </div>
  );
}

const textSelector = `[${TEXT_KEY_ATTRIBUTE}]`;
const indicatorSelector = `[${INDICATOR_ATTRIBUTE}]`;

// The select button covers the component, so what is under the pointer is found by position.
function findAtPoint(
  document: Document,
  x: number,
  y: number,
  selector: string,
): HTMLElement | null {
  if (typeof document.elementsFromPoint !== 'function') return null;
  const elementsAtPoint = document.elementsFromPoint(x, y);
  const element = elementsAtPoint.find((candidate) => candidate.closest(selector));
  return element?.closest<HTMLElement>(selector) ?? null;
}
