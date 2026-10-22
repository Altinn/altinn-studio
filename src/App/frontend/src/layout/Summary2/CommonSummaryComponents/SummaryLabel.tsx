import React, { useId } from 'react';

import { Description, HelpTextContainer } from '@app/form-component';
import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';
import { Label } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Caption } from 'src/components/form/caption/Caption';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Summary2/CommonSummaryComponents/SummaryLabel.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalTrb } from 'src/utils/layout/useEvalExpression';
import type { CaptionProps } from 'src/components/form/caption/Caption';

export function useSummaryLabelText(baseComponentId: string) {
  const config = useComponentConfig(baseComponentId);
  const description = useEvalOptionalTrb(config, 'description', CommonExpressions.TRBLabel);
  const help = useEvalOptionalTrb(config, 'help', CommonExpressions.TRBLabel);
  return { description, help };
}

interface SummaryLabelProps {
  baseComponentId: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  isCompact?: boolean;
  id?: string;
}

/** A summary label without form-input indicators, preserving container heading semantics. */
export function SummaryLabel({ baseComponentId, title, children, isCompact, id }: SummaryLabelProps) {
  const { description, help } = useSummaryLabelText(baseComponentId);
  const uniqueId = useId();
  return (
    <div
      id={id}
      className={cn(classes.label, isCompact && classes.compact)}
    >
      <div className={classes.titleAndHelp}>
        {children ?? (
          <Label
            asChild
            weight='regular'
          >
            <span>{title}</span>
          </Label>
        )}
        {help && (
          <SummaryHelpText
            id={uniqueId}
            title={title}
            help={help}
          />
        )}
      </div>
      {description && (
        <Description
          className={classes.description}
          componentId={uniqueId}
          description={<Lang id={description} />}
        />
      )}
    </div>
  );
}

function SummaryHelpText({ id, title, help }: { id: string; title: React.ReactNode; help: string }) {
  const { elementAsString } = useLanguage();
  return (
    <HelpTextContainer
      id={id}
      title={elementAsString(title)}
      helpText={<Lang id={help} />}
    />
  );
}

export function SummaryCaption({ baseComponentId, title, ...rest }: CaptionProps & { baseComponentId: string }) {
  const { description, help } = useSummaryLabelText(baseComponentId);
  const id = useId();
  const { elementAsString } = useLanguage();
  return (
    <Caption
      {...rest}
      id={rest.id ?? id}
      title={title}
      description={description && <Lang id={description} />}
      helpText={help ? { text: <Lang id={help} />, accessibleTitle: elementAsString(title) } : undefined}
    />
  );
}
