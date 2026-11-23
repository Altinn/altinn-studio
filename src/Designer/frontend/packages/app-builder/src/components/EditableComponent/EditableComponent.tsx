import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { INDICATOR_ATTRIBUTE } from '../../constants';
import type { LayoutComponent } from '../../types';
import {
  canBeRequired,
  getComponentText,
  getRequiredProperty,
  setRequiredValue,
} from '../../utils/componentUtils';
import { createDefaultRule, toRequiredExpression } from '../../utils/ruleUtils';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useRuleFields } from '../../hooks/useRuleFields';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { RequiredMenu } from '../RequiredMenu/RequiredMenu';
import type { RequiredChoice } from '../RequiredMenu/RequiredMenu';
import { ComponentStrip } from './ComponentStrip';
import { InlineAddButtons } from './InlineAddButtons';
import classes from './EditableComponent.module.css';

export type EditableComponentProps = {
  component: LayoutComponent;
  /** The component as the app shows it. */
  preview: ReactNode;
  className?: string;
  onDelete: () => void;
};

/**
 * A component on the canvas. It looks as it does in the app until it is selected. Its texts are edited
 * where they are, its controls do not take input, and the "required" tag after its label opens a menu.
 * When selected, it shows a strip with where it saves its answer, its rules and its tools.
 */
export function EditableComponent({
  component,
  preview,
  className,
  onDelete,
}: EditableComponentProps): ReactElement {
  const { t } = useTranslation();
  const { texts } = useAppBuilder();
  const { selectedComponentId, selectComponent } = useCanvasState();
  const { updateComponent } = usePageEditing();
  const ruleFields = useRuleFields(component.id);
  const previewRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>();
  const isSelected = selectedComponentId === component.id;
  const componentName =
    getComponentText(component, texts) ?? t(`app_builder.component_type.${component.type}`);

  useInertControls(previewRef);

  const handleClick = (event: MouseEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement;
    selectComponent(component.id);
    if (!previewRef.current?.contains(target)) return;
    // A click on a label would otherwise move focus to its input instead of editing the label.
    if (target.closest('label')) event.preventDefault();
    const indicator = target.closest<HTMLElement>(`[${INDICATOR_ATTRIBUTE}]`);
    if (indicator && canBeRequired(component)) {
      setMenuPosition(getPositionBelow(indicator, event.currentTarget));
    }
  };

  const handleRequiredChoice = (choice: RequiredChoice): void => {
    setMenuPosition(undefined);
    const defaultRule = createDefaultRule(ruleFields);
    const values: Record<RequiredChoice, unknown> = {
      required: true,
      optional: false,
      conditional: defaultRule ? toRequiredExpression(defaultRule) : true,
    };
    updateComponent(component.id, (current) => setRequiredValue(current, values[choice]));
  };

  return (
    <div
      className={cn(classes.editableComponent, className, { [classes.selected]: isSelected })}
      data-component-id={component.id}
      onClick={handleClick}
    >
      {!isSelected && (
        <button
          type='button'
          className={classes.selectButton}
          onClick={() => selectComponent(component.id)}
        >
          {t('app_builder.select_component', { componentName })}
        </button>
      )}
      <div ref={previewRef} className={classes.preview}>
        {preview}
      </div>
      {isSelected && <InlineAddButtons component={component} />}
      {isSelected && <ComponentStrip component={component} onDelete={onDelete} />}
      {menuPosition && (
        <RequiredMenu
          current={getRequiredChoice(component)}
          position={menuPosition}
          onChoose={handleRequiredChoice}
          onClose={() => setMenuPosition(undefined)}
        />
      )}
    </div>
  );
}

function getRequiredChoice(component: LayoutComponent): RequiredChoice {
  const { kind } = getRequiredProperty(component);
  if (kind === 'always') return 'required';
  if (kind === 'never') return 'optional';
  return 'conditional';
}

function getPositionBelow(element: HTMLElement, container: HTMLElement): CSSProperties {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    top: elementRect.bottom - containerRect.top + 4,
    left: elementRect.left - containerRect.left,
  };
}

const focusableControls =
  'input, select, textarea, button, a[href], [tabindex]:not([data-text-key])';

/**
 * The controls in the preview only show what the app looks like, so they are kept out of the tab
 * order. The texts in it stay focusable, since they are edited in place.
 */
function useInertControls(previewRef: React.RefObject<HTMLDivElement>): void {
  useEffect(() => {
    previewRef.current
      ?.querySelectorAll<HTMLElement>(focusableControls)
      .forEach((control) => control.setAttribute('tabindex', '-1'));
  });
}
