import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { BaseTable } from '@app/form-component';
import cn from 'classnames';

import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/RepeatingGroup/Table/RepeatingGroupTableValidation.module.css';
import { RepeatingGroupValidationMessage } from 'src/layout/RepeatingGroup/Table/RepeatingGroupValidationMessage';
import { getHighestSeverity, validationSeverityPresentation } from 'src/layout/RepeatingGroup/Table/validationSeverity';
import utilClasses from 'src/styles/utils.module.css';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation, ValidationSeverity } from 'src/features/validation';

export interface RepeatingGroupPanelMessage {
  validation: NodeRefValidation;
  /** The validation's component renders the same message in its table cell, where screen readers read it. */
  renderedInTableCell: boolean;
}

export function RepeatingGroupTableField({
  baseComponentId,
  panelSeverity,
}: {
  baseComponentId: string;
  panelSeverity: ValidationSeverity | undefined;
}) {
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const severity = getHighestSeverity(validations);
  const presentation = severity ? validationSeverityPresentation[severity] : undefined;
  const arrowPresentation = panelSeverity ? validationSeverityPresentation[panelSeverity] : presentation;

  return (
    <div
      className={classes.field}
      data-validation-field={baseComponentId}
    >
      {/* The panel under the row shows sighted users the message. Screen readers read the cell's copy instead. */}
      <div className={cn(classes.control, utilClasses.visuallyHiddenValidations)}>
        <GenericComponent
          baseComponentId={baseComponentId}
          overrideDisplay={{
            renderedInTable: true,
            renderLabel: false,
            renderLegend: false,
          }}
          overrideItemProps={{ grid: {} }}
        />
      </div>
      {presentation && (
        <span
          className={classes.indicator}
          data-color={presentation.color}
          data-testid='table-field-validation-indicator'
          aria-hidden
        >
          <presentation.Icon />
        </span>
      )}
      {presentation && (
        <span
          className={classes.arrow}
          data-color={arrowPresentation?.color}
          data-validation-arrow
          aria-hidden
        />
      )}
    </div>
  );
}

export function RepeatingGroupMessagePanel({
  messages,
  columnSpan,
  index,
  className,
}: {
  messages: RepeatingGroupPanelMessage[];
  columnSpan: number;
  index: number;
  className?: string;
}) {
  const getUniqueKey = useGetUniqueKeyFromObject();
  if (messages.length === 0) {
    return null;
  }

  const severity = getHighestSeverity(messages.map(({ validation }) => validation));
  // A row with only field messages is a visual duplicate, so screen readers skip the whole row.
  const readableByScreenReaders = messages.some(({ renderedInTableCell }) => !renderedInTableCell);

  return (
    <BaseTable.Row
      className={cn(classes.messageRow, className)}
      data-for-row={index}
      data-testid='table-row-validation-messages'
      aria-hidden={readableByScreenReaders ? undefined : true}
    >
      <BaseTable.Cell
        colSpan={columnSpan}
        className={classes.messageCell}
      >
        <ul
          className={classes.messages}
          data-color={severity ? validationSeverityPresentation[severity].color : undefined}
        >
          {messages.map(({ validation, renderedInTableCell }) => (
            <PanelMessageItem
              key={getUniqueKey(validation)}
              hiddenFromScreenReaders={renderedInTableCell}
            >
              <RepeatingGroupValidationMessage validation={validation} />
            </PanelMessageItem>
          ))}
        </ul>
      </BaseTable.Cell>
    </BaseTable.Row>
  );
}

const focusableSelector =
  'a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]:not([tabindex="-1"])';

/**
 * The panel copy of a field message is only for sighted users. It is aria-hidden rather than inert, so a mouse user can
 * still click a link in it. A keyboard user reaches the same link in the cell copy, which is revealed while focused.
 * Everything focusable inside it leaves the tab order, which keeps aria-hidden valid. The message content is rendered
 * by other components and can change, so the observer applies this again after it does.
 */
function PanelMessageItem({
  hiddenFromScreenReaders,
  children,
}: {
  hiddenFromScreenReaders: boolean;
  children: ReactNode;
}) {
  const itemRef = useRef<HTMLLIElement>(null);

  useLayoutEffect(() => {
    const item = itemRef.current;
    if (!item || !hiddenFromScreenReaders) {
      return;
    }
    const removeFromTabOrder = () => {
      for (const element of item.querySelectorAll(focusableSelector)) {
        element.setAttribute('tabindex', '-1');
      }
    };
    removeFromTabOrder();
    const observer = new MutationObserver(removeFromTabOrder);
    observer.observe(item, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [hiddenFromScreenReaders]);

  return (
    <li
      ref={itemRef}
      aria-hidden={hiddenFromScreenReaders ? true : undefined}
    >
      {children}
    </li>
  );
}
