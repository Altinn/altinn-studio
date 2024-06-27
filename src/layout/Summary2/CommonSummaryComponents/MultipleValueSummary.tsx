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

export const MultipleValueSummary = ({ title, componentNode, showAsList }: MultipleValueSummaryProps) => {
  const formDataSelector = FD.useDebouncedSelector();

  const langTools = useLanguage();
  const options = useAllOptionsSelector();
  const summaryData = getSummaryData(componentNode, langTools, options, formDataSelector);
  const displayValues = Object.values(summaryData);

  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');

  return (
    <div className={classes.checkboxSummaryItem}>
      <div className={cn(classes.labelValueWrapper, { [classes.error]: errors.length > 0 })}>
        <Label weight={'regular'}>{title}</Label>
        {displayValues?.length > 0 && showAsList && (
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
        {displayValues?.length > 0 && !showAsList && (
          <Paragraph
            asChild
            className={classes.formValue}
          >
            <span>{displayValues.join(', ')}</span>
          </Paragraph>
        )}
        {!displayValues ||
          (displayValues?.length < 1 && (
            <Paragraph
              asChild
              className={classes.emptyValue}
            >
              <span>
                <Lang id={'general.empty_summary'}></Lang>
              </span>
            </Paragraph>
          ))}
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
