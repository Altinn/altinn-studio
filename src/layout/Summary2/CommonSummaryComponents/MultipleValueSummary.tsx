import React from 'react';

import { ErrorMessage, Label, List, Paragraph } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { FD } from 'src/features/formData/FormDataWrite';
import { Lang } from 'src/features/language/Lang';
import { type IUseLanguage, useLanguage } from 'src/features/language/useLanguage';
import { getCommaSeparatedOptionsToText } from 'src/features/options/getCommaSeparatedOptionsToText';
import { useAllOptionsSelector } from 'src/features/options/useAllOptions';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary.module.css';
import type { FormDataSelector } from 'src/layout/index';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type MultipleValueSummaryProps = {
  title: React.ReactNode;
  componentNode: LayoutNode;
  showAsList?: boolean;
  isCompact?: boolean;
};

function getSummaryData(
  node: LayoutNode<any>,
  langTools: IUseLanguage,
  options: ReturnType<typeof useAllOptionsSelector>,
  formDataSelector: FormDataSelector,
): { [key: string]: string } {
  if (!node.item.dataModelBindings?.simpleBinding) {
    return {};
  }

  const value = String(node.getFormData(formDataSelector).simpleBinding ?? '');
  const optionList = options(node.item.id);
  return getCommaSeparatedOptionsToText(value, optionList, langTools);
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

export const MultipleValueSummary = ({ title, componentNode, showAsList, isCompact }: MultipleValueSummaryProps) => {
  const formDataSelector = FD.useDebouncedSelector();

  const langTools = useLanguage();
  const options = useAllOptionsSelector();
  const summaryData = getSummaryData(componentNode, langTools, options, formDataSelector);
  const displayValues = Object.values(summaryData);

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
          <Label weight={'regular'}>{title}</Label>
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
                <Lang id={'general.empty_summary'}></Lang>
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
              ></Lang>
            </ErrorMessage>
          ))}
      </div>
      <EditButton
        className={classes.editButton}
        componentNode={componentNode}
        summaryComponentId={''}
      />
    </div>
  );
};
