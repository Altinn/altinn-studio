import { DisplayNumber } from '@app/form-component/app-components/DisplayNumber';
import { Flex } from '@app/form-component/app-components/Flex';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { DisplayNumberProps } from '@app/form-component/app-components/DisplayNumber';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Number.module.css';

export type NumberDirection = 'horizontal' | 'vertical';

export interface NumberProps {
  componentId: string;
  value: number;
  formatting?: DisplayNumberProps['formatting'];
  title?: string;
  description?: string;
  help?: string;
  icon?: string;
  direction?: NumberDirection;
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
}

export function Number({
  componentId,
  value,
  formatting,
  title,
  description,
  help,
  icon,
  direction = 'horizontal',
  labelGrid,
  innerGrid,
}: NumberProps) {
  const { lang, langAsString } = useTranslation();

  if (!title) {
    return <DisplayNumber value={value} formatting={formatting} iconUrl={icon} iconAltText='' />;
  }

  const labelId = getLabelId(componentId);

  return (
    <div
      id={labelId}
      className={cn(
        classes.label,
        classes.numberComponent,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
      )}
    >
      <Flex item size={labelGrid ?? { xs: 12 }}>
        <span className={classes.labelWrapper}>
          <span className={classes.labelRow}>
            <DsLabel asChild>
              <span className={classes.labelContent}>{lang(title)}</span>
            </DsLabel>
            {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
          </span>
          {description && <Description componentId={componentId} description={lang(description)} />}
        </span>
      </Flex>
      <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
        <DisplayNumber
          value={value}
          formatting={formatting}
          iconUrl={icon}
          iconAltText={langAsString(title)}
          labelId={labelId}
        />
      </ComponentStructure>
    </div>
  );
}
