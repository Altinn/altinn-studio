import cn from 'classnames';

import { DisplayDate } from '../../app-components/DisplayDate';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import { LabelAsSpan } from '../common/LabelAsSpan';
import { getLabelId } from '../utils/labelIds';
import classes from './Date.module.css';
import type { IGridStyling } from '../../app-components/Flex';
import type { LabelAsSpanDirection } from '../common/LabelAsSpan';

export type DateDirection = LabelAsSpanDirection;

export interface DateProps {
  componentId: string;
  value: string | null;
  title?: string;
  description?: string;
  help?: string;
  icon?: string;
  direction?: DateDirection;
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
  hideLabel?: boolean;
}

export function Date({
  componentId,
  value,
  title,
  description,
  help,
  icon,
  direction = 'horizontal',
  labelGrid,
  innerGrid,
  hideLabel = false,
}: DateProps) {
  const { langAsString } = useTranslation();

  if (!title) {
    return <DisplayDate value={value} />;
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
        classes.dateComponent,
        !hideLabel && (direction === 'vertical' ? classes.vertical : classes.horizontal),
      )}
    >
      <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
        <DisplayDate
          value={value}
          iconUrl={icon}
          iconAltText={langAsString(title)}
          labelId={labelId}
        />
      </ComponentStructure>
    </LabelAsSpan>
  );
}
