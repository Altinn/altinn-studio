import cn from 'classnames';

import { DisplayNumber } from '../../app-components/DisplayNumber';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import { LabelAsSpan } from '../common/LabelAsSpan';
import { getLabelId } from '../utils/labelIds';
import classes from './Number.module.css';
import type { DisplayNumberProps } from '../../app-components/DisplayNumber';
import type { IGridStyling } from '../../app-components/Flex';
import type { LabelAsSpanDirection } from '../common/LabelAsSpan';

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

  if (isNaN(value)) {
    return null;
  }

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
