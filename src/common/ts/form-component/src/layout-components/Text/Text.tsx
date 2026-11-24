import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { DisplayText } from '../../app-components/DisplayText';
import { Flex } from '../../app-components/Flex';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import { Description } from '../common/Description';
import { HelpTextContainer } from '../common/HelpTextContainer';
import { getLabelId } from '../utils/labelIds';
import classes from './Text.module.css';
import type { IGridStyling } from '../../app-components/Flex';

export type TextDirection = 'horizontal' | 'vertical';

export interface TextProps {
  componentId: string;
  value: string;
  title?: string;
  description?: string;
  help?: string;
  icon?: string;
  direction?: TextDirection;
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
}

export function Text({
  componentId,
  value,
  title,
  description,
  help,
  icon,
  direction = 'horizontal',
  labelGrid,
  innerGrid,
}: TextProps) {
  const { lang, langAsString } = useTranslation();

  if (!title) {
    return <DisplayText value={value} iconUrl={icon} iconAltText='' />;
  }

  const labelId = getLabelId(componentId);

  return (
    <div
      id={labelId}
      className={cn(
        classes.label,
        classes.textComponent,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
      )}
    >
      <Flex item size={labelGrid ?? { xs: 12 }}>
        <span className={classes.labelWrapper}>
          <span className={classes.labelRow}>
            <DsLabel asChild>
              <span>{lang(title)}</span>
            </DsLabel>
            {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
          </span>
          {description && <Description componentId={componentId} description={lang(description)} />}
        </span>
      </Flex>
      <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
        <DisplayText
          value={value}
          iconUrl={icon}
          iconAltText={langAsString(title)}
          labelId={labelId}
        />
      </ComponentStructure>
    </div>
  );
}
