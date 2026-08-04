import type { PropsWithChildren } from 'react';

import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from './LabelAsSpan.module.css';

export type LabelAsSpanDirection = 'horizontal' | 'vertical';

export interface LabelAsSpanProps {
  componentId: string;
  title: string;
  description?: string;
  help?: string;
  direction?: LabelAsSpanDirection;
  className?: string;
}

export function LabelAsSpan({
  componentId,
  title,
  description,
  help,
  direction = 'horizontal',
  className,
  children,
}: PropsWithChildren<LabelAsSpanProps>) {
  const { lang } = useTranslation();
  const labelId = getLabelId(componentId);

  return (
    <span
      className={cn(
        classes.fieldWrapper,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
        className,
      )}
    >
      <span className={classes.labelWrapper}>
        <span className={classes.labelRow}>
          <DsLabel asChild weight='medium' data-size='md'>
            <span id={labelId}>{lang(title)}</span>
          </DsLabel>
          {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
        </span>
        {description && <Description componentId={componentId} description={lang(description)} />}
      </span>
      {children}
    </span>
  );
}
