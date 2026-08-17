import { DisplayDate } from '@app/form-component/app-components/DisplayDate';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelAsSpan } from '@app/form-component/layout-components/common/LabelAsSpan';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { LabelAsSpanDirection } from '@app/form-component/layout-components/common/LabelAsSpan';

import classes from './Date.module.css';

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
        direction === 'vertical' ? classes.vertical : classes.horizontal,
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
