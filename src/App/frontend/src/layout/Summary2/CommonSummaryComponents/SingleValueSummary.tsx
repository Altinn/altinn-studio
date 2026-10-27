import React from 'react';

import { Label, Paragraph } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { LabelContent } from 'src/components/label/LabelContent';
import { Lang } from 'src/features/language/Lang';
import { ValidationMessageList } from 'src/features/validation/ValidationMessageList';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary.module.css';
import { useSummaryLabelProps } from 'src/layout/Summary2/CommonSummaryComponents/useSummaryLabelText';
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
  const labelProps = useSummaryLabelProps(targetBaseComponentId);
  const label = (
    <Label weight='regular'>
      {title}
      {!!title?.toString()?.length && isCompact && ':'}
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
            <LabelContent
              {...labelProps}
              label={label}
              isCompact={isCompact}
            />
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
