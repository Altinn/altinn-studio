import type { PropsWithChildren } from 'react';

import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Flex } from '../../../app-components/Flex';
import { useTranslation } from '../../../LanguageTranslatorProvider';
import { getLabelId } from '../../utils/labelIds';
import { Description } from '../Description';
import { HelpTextContainer } from '../HelpTextContainer';
import classes from './LabelAsSpan.module.css';
import type { IGridStyling } from '../../../app-components/Flex';

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
      {!hideLabel && (
        <Flex item size={labelGrid ?? { xs: 12 }}>
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
        </Flex>
      )}
      {children}
    </span>
  );
}
