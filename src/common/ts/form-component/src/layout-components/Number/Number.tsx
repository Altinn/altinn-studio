import { DisplayNumber } from '@app/form-component/app-components/DisplayNumber';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelAsSpan } from '@app/form-component/layout-components/common/LabelAsSpan';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import cn from 'classnames';
import type { DisplayNumberProps } from '@app/form-component/app-components/DisplayNumber';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { LabelAsSpanDirection } from '@app/form-component/layout-components/common/LabelAsSpan';

import classes from './Number.module.css';

export type NumberDirection = LabelAsSpanDirection;

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
  hideLabel?: boolean;
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
  hideLabel = false,
}: NumberProps) {
  const { langAsString } = useTranslation();

  if (!title) {
    return <DisplayNumber value={value} formatting={formatting} />;
  }

  const labelId = getLabelId(componentId);

  return (
    <LabelAsSpan
      componentId={componentId}
      title={title}
      description={hideLabel ? undefined : description}
      help={hideLabel ? undefined : help}
      labelGrid={labelGrid}
      hideLabel={hideLabel}
      className={cn(
        classes.label,
        classes.numberComponent,
        !hideLabel && (direction === 'vertical' ? classes.vertical : classes.horizontal),
      )}
    >
      <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
        <DisplayNumber
          value={value}
          formatting={formatting}
          iconUrl={icon}
          iconAltText={langAsString(title)}
          labelId={labelId}
        />
      </ComponentStructure>
    </LabelAsSpan>
  );
}
