import React from 'react';

import { Label, Paragraph } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { ValidationMessageList } from 'src/features/validation/ValidationMessageList';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary.module.css';
import { SummaryLabel } from 'src/layout/Summary2/CommonSummaryComponents/SummaryLabel';
import type { BaseValidation } from 'src/features/validation';

type SingleValueSummaryProps = {
  title: React.ReactNode;
  errors?: BaseValidation[];
  targetBaseComponentId: string;
  displayData?: string | React.ReactNode;
  hideEditButton?: boolean;
  multiline?: boolean;
  isCompact: boolean | undefined;
  emptyFieldText: string | undefined;
  showLabelMetadata?: boolean;
};

export const SingleValueSummary = ({
  title,
  errors,
  targetBaseComponentId,
  displayData,
  hideEditButton,
  multiline,
  isCompact,
  emptyFieldText,
  showLabelMetadata = true,
}: SingleValueSummaryProps) => {
  const label = (
    <Label
      asChild
      weight='regular'
    >
      <span>
        {title}
        {!!title?.toString()?.length && isCompact && ':'}
      </span>
    </Label>
  );
  return (
    <div
      className={classes.summaryItemWrapper}
      data-testid='summary-single-value-component'
    >
      <div className={classes.summaryItem}>
        <div className={cn(classes.labelValueWrapper, isCompact && classes.compact)}>
          {showLabelMetadata ? (
            <SummaryLabel
              baseComponentId={targetBaseComponentId}
              title={title}
              isCompact={isCompact}
            >
              {label}
            </SummaryLabel>
          ) : (
            label
          )}
          <Paragraph
            asChild
            className={cn(
              {
                [classes.error]: errors && errors?.length > 0,
                [classes.emptyValue]: !displayData,
                [classes.formValue]: displayData,
                [classes.multiline]: multiline,
              },
              classes.summaryValue,
            )}
          >
            <span>
              {!displayData && <Lang id={emptyFieldText ?? 'general.empty_summary'} />}
              {displayData}
            </span>
          </Paragraph>
        </div>
        {!hideEditButton && (
          <EditButton
            className={classes.editButton}
            targetBaseComponentId={targetBaseComponentId}
          />
        )}
      </div>

      <ValidationMessageList
        validations={errors}
        size='sm'
      />
    </div>
  );
};
