import React from 'react';
import type { HtmlHTMLAttributes } from 'react';

import { Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import classes from 'src/components/form/caption/Caption.module.css';
import { Description } from 'src/components/form/Description';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import type { ILabelSettings } from 'src/layout/common.generated';

type HelpTextProps = {
  text?: React.ReactNode;
  accessibleTitle?: string;
};

export type CaptionProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  helpText?: HelpTextProps;
  required?: boolean;
  labelSettings?: ILabelSettings;
  designSystemLabelProps?: DesignsystemetLabelProps;
} & Omit<HtmlHTMLAttributes<HTMLTableCaptionElement>, 'children' | 'title'>;

export const Caption = ({
  title,
  description,
  required,
  labelSettings,
  id,
  className,
  helpText,
  designSystemLabelProps,
  ...rest
}: CaptionProps) => (
  <caption
    {...rest}
    className={cn(classes.tableCaption, className)}
  >
    <DesignsystemetLabel
      asChild
      className={classes.captionTitle}
      {...designSystemLabelProps}
    >
      <div>
        {title}
        <RequiredIndicator required={required} />
        <OptionalIndicator
          readOnly={false}
          required={required}
          showOptionalMarking={!!labelSettings?.optionalIndicator}
        />
      </div>
    </DesignsystemetLabel>
    {helpText && (
      <HelpTextContainer
        id={id}
        helpText={helpText.text}
        title={helpText.accessibleTitle}
      />
    )}
    {description && (
      <Description
        className={classes.description}
        componentId={id}
        description={description}
      />
    )}
  </caption>
);
