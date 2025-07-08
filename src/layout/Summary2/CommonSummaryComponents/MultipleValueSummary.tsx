import React from 'react';

import { Label, List, Paragraph, ValidationMessage } from '@digdir/designsystemet-react';
import cn from 'classnames';
import dot from 'dot-object';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary.module.css';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useFormDataFor } from 'src/utils/layout/useNodeItem';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ValidTypes = 'MultipleSelect' | 'Checkboxes';
type ValidNodes = LayoutNode<ValidTypes>;

type Row = Record<string, string | number | boolean>;

interface MultipleValueSummaryProps {
  title: React.ReactNode;
  baseComponentId: string;
  displayValues: ReturnType<typeof useMultipleValuesForSummary>;
  showAsList?: boolean;
  isCompact: boolean | undefined;
  emptyFieldText: string | undefined;
}

function getDisplayType(
  displayValues: string[],
  showAsList?: boolean,
  compact?: boolean,
): 'list' | 'inline' | 'empty' | null {
  if (!displayValues || displayValues?.length < 1) {
    return 'empty';
  }
  if (compact || !showAsList) {
    return 'inline';
  }
  return 'list';
}

function isValidType(type: CompTypes): boolean {
  return type === 'MultipleSelect' || type === 'Checkboxes';
}

export function useMultipleValuesForSummary(baseComponentId: string) {
  const dataModelBindings = useDataModelBindingsFor<ValidTypes>(baseComponentId, isValidType);
  const options = useOptionsFor(baseComponentId, 'multi').options;
  const rawFormData = useFormDataFor<ValidTypes>(baseComponentId, isValidType);
  const { langAsString } = useLanguage();

  const relativeCheckedPath =
    dataModelBindings?.checked && dataModelBindings?.group
      ? dataModelBindings.checked.field.replace(`${dataModelBindings.group.field}.`, '')
      : undefined;

  const relativeSimpleBindingPath =
    dataModelBindings?.simpleBinding && dataModelBindings?.group
      ? dataModelBindings.simpleBinding.field.replace(`${dataModelBindings.group.field}.`, '')
      : undefined;

  const displayRows: string[] = (rawFormData?.group as unknown as Row[])
    ?.filter((row) => (!relativeCheckedPath ? true : dot.pick(relativeCheckedPath, row) === true))
    .map((row) => (!relativeSimpleBindingPath ? true : dot.pick(relativeSimpleBindingPath, row)));

  return dataModelBindings.group
    ? Object.values(getCommaSeparatedOptionsToText(displayRows?.join(','), options, langAsString))
    : Object.values(getCommaSeparatedOptionsToText(rawFormData.simpleBinding, options, langAsString));
}

export const MultipleValueSummary = ({
  title,
  baseComponentId,
  displayValues,
  showAsList,
  isCompact,
  emptyFieldText,
}: MultipleValueSummaryProps) => {
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const errors = validationsOfSeverity(validations, 'error');

  const displayType = getDisplayType(displayValues, showAsList, isCompact);
  return (
    <div className={classes.summaryItemWrapper}>
      <div className={classes.summaryItem}>
        <div
          className={cn(classes.labelValueWrapper, {
            [classes.error]: errors.length > 0,
            [classes.compact]: isCompact,
          })}
        >
          <Label weight='regular'>{title}</Label>
          {displayType === 'list' && (
            <List.Unordered>
              {displayValues?.map((item) => (
                <List.Item
                  key={`list-item-${item}`}
                  className={classes.formValue}
                >
                  {item}
                </List.Item>
              ))}
            </List.Unordered>
          )}
          {displayType === 'inline' && (
            <Paragraph
              asChild
              className={classes.formValue}
            >
              <span>{displayValues.join(', ')}</span>
            </Paragraph>
          )}
          {displayType === 'empty' && (
            <Paragraph
              asChild
              className={classes.emptyValue}
            >
              <span>
                <Lang id={emptyFieldText ?? 'general.empty_summary'} />
              </span>
            </Paragraph>
          )}
        </div>
        {errors.length > 0 &&
          errors.map(({ message }) => (
            <ValidationMessage
              key={message.key}
              data-size='sm'
            >
              <Lang
                id={message.key}
                params={message.params}
              />
            </ValidationMessage>
          ))}
      </div>
      <EditButton
        className={classes.editButton}
        targetBaseComponentId={baseComponentId}
      />
    </div>
  );
};
