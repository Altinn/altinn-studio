import { DisplayText } from '@app/form-component/app-components/DisplayText';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Text.module.css';

export type TextDirection = 'horizontal' | 'vertical';

export interface TextProps {
  componentId: string;
  value: string;
  title?: string;
  description?: string;
  help?: string;
  icon?: string;
  direction?: TextDirection;
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
  innerGrid,
}: TextProps) {
  const { lang, langAsString } = useTranslation();

  if (!title) {
    return <DisplayText value={value} iconUrl={icon} iconAltText='' />;
  }

  const labelId = getLabelId(componentId);

  return (
    <span
      id={labelId}
      className={cn(
        classes.label,
        classes.textComponent,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
      )}
    >
      <span className={classes.labelWrapper}>
        <span className={classes.labelRow}>
          <DsLabel asChild weight='medium' data-size='md'>
            <span>{lang(title)}</span>
          </DsLabel>
          {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
        </span>
        {description && <Description componentId={componentId} description={lang(description)} />}
      </span>
      <span className={classes.value}>
        <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
          <DisplayText
            value={value}
            iconUrl={icon}
            iconAltText={langAsString(title)}
            labelId={labelId}
          />
        </ComponentStructure>
      </span>
    </span>
  );
}
