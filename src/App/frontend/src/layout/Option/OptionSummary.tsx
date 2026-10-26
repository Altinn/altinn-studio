import React from 'react';

import { HelpText } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOptionsFor } from 'src/features/options/useOptionsFor';
import classes from 'src/layout/Option/OptionSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const OptionSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides<'Option'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const { langAsString } = useLanguage();
  const config = useComponentConfig(targetBaseComponentId, 'Option');
  const value = useEvalExpression(config.value, Expressions.Option.value);
  const { options } = useOptionsFor(targetBaseComponentId, 'single');
  const selectedOption = options.find((option) => option.value === value);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.Option.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Option.textResourceBindings.title,
  );

  const title = summaryTitle || resolvedTitle;
  const compact = (config.direction === 'horizontal' && isCompact === undefined) || isCompact;
  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={selectedOption ? SummaryContains.SomeUserContent : SummaryContains.EmptyValueNotRequired}
      className={classes.summary}
    >
      <SingleValueSummary
        title={title && <Lang id={title} />}
        displayData={
          selectedOption && (
            <span className={classes.value}>
              <span className={classes.label}>
                <Lang id={selectedOption.label} />
                {selectedOption.helpText && (
                  <HelpText title={langAsString(selectedOption.helpText)}>
                    <Lang id={selectedOption.helpText} />
                  </HelpText>
                )}
              </span>
              {selectedOption.description && (
                <span className={classes.description}>
                  <Lang id={selectedOption.description} />
                </span>
              )}
            </span>
          )
        }
        targetBaseComponentId={targetBaseComponentId}
        hideEditButton={true}
        isCompact={compact}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
