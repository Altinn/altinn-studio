import React, { forwardRef } from 'react';

import {
  Description,
  getDescriptionId,
  HelpTextContainer,
  OptionalIndicator,
  RequiredIndicator,
} from '@app/form-component';
import cn from 'classnames';
import type { ILabelSettings } from '@app/layout-contract/generated/common.generated';

import classes from 'src/components/label/LabelContent.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';

export type LabelContentProps = Readonly<{
  id: string;
  wrapperId?: string;
  label?: React.ReactNode;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  help?: string;
  helpTitle?: string;
  labelSettings?: ILabelSettings;
  summary?: boolean;
  isCompact?: boolean;
}> & { className?: string };

export const LabelContent = forwardRef<HTMLSpanElement, LabelContentProps>(function LabelContent(
  {
    id,
    wrapperId,
    label,
    description,
    required,
    readOnly,
    help,
    helpTitle,
    labelSettings,
    summary,
    isCompact,
    className,
  },
  ref,
) {
  const { overrideDisplay } = useFormComponentCtx() ?? {};
  const { elementAsString } = useLanguage();

  if (overrideDisplay?.renderLabel === false) {
    return null;
  }

  const ContentTag = summary ? 'div' : 'span';
  const content = (
    <>
      <ContentTag className={classes.labelContainer}>
        <ContentTag className={classes.labelContent}>
          {typeof label === 'string' ? <Lang id={label} /> : label}
          <RequiredIndicator required={required} />
          <OptionalIndicator
            readOnly={readOnly}
            required={required}
            showOptionalMarking={labelSettings?.optionalIndicator !== false}
          />
        </ContentTag>
        {help && (
          <HelpTextContainer
            id={id}
            helpText={<Lang id={help} />}
            title={helpTitle ?? (typeof label === 'string' ? label : elementAsString(label))}
          />
        )}
      </ContentTag>
      {description && (
        <Description
          className={classes.description}
          componentId={id}
          key={getDescriptionId(id)}
          description={<Lang id={description} />}
        />
      )}
    </>
  );
  const combinedClassName = cn(
    classes.labelWrapper,
    summary && classes.summary,
    isCompact && classes.compact,
    className,
  );

  return summary ? (
    <div
      id={wrapperId}
      className={combinedClassName}
    >
      {content}
    </div>
  ) : (
    <span
      id={wrapperId}
      className={combinedClassName}
      ref={ref}
    >
      {content}
    </span>
  );
});
