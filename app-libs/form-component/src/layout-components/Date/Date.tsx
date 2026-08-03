import { DisplayDate } from '@app/form-component/app-components/DisplayDate';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelAsSpan } from '@app/form-component/layout-components/common/LabelAsSpan';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { LabelAsSpanDirection } from '@app/form-component/layout-components/common/LabelAsSpan';

export type DateDirection = LabelAsSpanDirection;

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
  const { langAsString } = useTranslation();

  if (!title) {
    return <DisplayDate value={value} iconUrl={icon} iconAltText='' />;
  }

  const labelId = getLabelId(componentId);

  return (
    <LabelAsSpan
      componentId={componentId}
      title={title}
      description={description}
      help={help}
      direction={direction}
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
