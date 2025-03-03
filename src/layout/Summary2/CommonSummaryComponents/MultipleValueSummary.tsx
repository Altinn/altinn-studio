import React from 'react';

import { ErrorMessage, Label, List, Paragraph } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useNodeOptions } from 'src/features/options/useNodeOptions';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary.module.css';
import { useNodeFormData } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ValidTypes = 'MultipleSelect' | 'Checkboxes';
type ValidNodes = LayoutNode<ValidTypes>;

interface MultipleValueSummaryProps {
  title: React.ReactNode;
  componentNode: ValidNodes;
  showAsList?: boolean;
  isCompact?: boolean;
  emptyFieldText?: string;
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

export const MultipleValueSummary = ({
  title,
  componentNode,
  showAsList,
  isCompact,
  emptyFieldText,
}: MultipleValueSummaryProps) => {
  const options = useNodeOptions(componentNode).options;
  const rawFormData = useNodeFormData(componentNode);
  const { langAsString } = useLanguage();
  const displayValues = Object.values(getCommaSeparatedOptionsToText(rawFormData.simpleBinding, options, langAsString));

  const validations = useUnifiedValidationsForNode(componentNode);
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
            <List.Root>
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
            </List.Root>
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
            <ErrorMessage key={message.key}>
              <Lang
                id={message.key}
                params={message.params}
                node={componentNode}
              />
            </ErrorMessage>
          ))}
      </div>
      <EditButton
        className={classes.editButton}
        componentNode={componentNode}
        summaryComponentId=''
      />
    </div>
  );
};
