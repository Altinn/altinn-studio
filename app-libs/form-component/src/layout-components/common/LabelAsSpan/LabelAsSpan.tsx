import type { PropsWithChildren } from 'react';

import { Flex } from '@app/form-component/app-components/Flex';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './LabelAsSpan.module.css';

export type LabelAsSpanDirection = 'horizontal' | 'vertical';

export interface LabelAsSpanProps {
  componentId: string;
  title: string;
  description?: string;
  help?: string;
  labelGrid?: IGridStyling;
  className?: string;
  hideLabel?: boolean;
}

export function LabelAsSpan({
  componentId,
  title,
  description,
  help,
  labelGrid,
  className,
  hideLabel = false,
  children,
}: PropsWithChildren<LabelAsSpanProps>) {
  const { lang } = useTranslation();
  const labelId = getLabelId(componentId);

  return (
    <span id={labelId} className={cn(classes.fieldWrapper, className)}>
      <Flex item size={labelGrid ?? { xs: 12 }}>
        {!hideLabel && (
          <DsLabel asChild>
            <span className={classes.labelWrapper}>
              <span className={classes.labelContainer}>
                <span className={classes.labelContent}>{lang(title)}</span>
                {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
              </span>
              {description && (
                <Description
                  componentId={componentId}
                  description={lang(description)}
                  className={classes.description}
                />
              )}
            </span>
          </DsLabel>
        )}
      </Flex>
      {children}
    </span>
  );
}
