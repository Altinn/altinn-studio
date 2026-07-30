import { DisplayDate } from '@app/form-component/app-components/DisplayDate';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Date.module.css';

export type DateDirection = 'horizontal' | 'vertical';

export interface DateProps {
  componentId: string;
  value: string | null;
  title?: string;
  description?: string;
  help?: string;
  icon?: string;
  direction?: DateDirection;
  innerGrid?: IGridStyling;
}

export function Date({
  componentId,
  value,
  title,
  description,
  help,
  icon,
  direction = 'horizontal',
  innerGrid,
}: DateProps) {
  const { lang, langAsString } = useTranslation();

  if (!title) {
    return <DisplayDate value={value} iconUrl={icon} iconAltText='' />;
  }

  const labelId = getLabelId(componentId);

  return (
    <span
      id={labelId}
      className={cn(
        classes.label,
        classes.dateComponent,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
      )}
    >
      <span className={classes.labelWrapper}>
        <span className={classes.labelRow}>
          <DsLabel asChild>
            <span>{lang(title)}</span>
          </DsLabel>
          {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
        </span>
        {description && <Description componentId={componentId} description={lang(description)} />}
      </span>
      <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
        <DisplayDate
          value={value}
          iconUrl={icon}
          iconAltText={langAsString(title)}
          labelId={labelId}
        />
      </ComponentStructure>
    </span>
  );
}
