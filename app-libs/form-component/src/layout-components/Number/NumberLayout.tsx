import type { ReactNode } from 'react';
import type { NumericFormatProps, PatternFormatProps } from 'react-number-format';

import { DisplayNumber } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';

import classes from './NumberLayout.module.css';

export interface NumberLayoutProps {
  /** The numeric value to display. Returns null when NaN. */
  value: number;
  /** Number formatting config (already converted from IFormatting by the wrapper). */
  formatting?: { number?: NumericFormatProps | PatternFormatProps };
  /** URL of an icon to display next to the number. */
  icon?: string;
  /** Layout direction: horizontal (side-by-side) or vertical (stacked). */
  direction?: 'horizontal' | 'vertical';
  /** Text-resource key for the label/title. When undefined, renders the number without a label wrapper. */
  title?: string;
  /** The indexed component ID, used for the label `aria-labelledby` association and `form-content-` wrapper. */
  componentId?: string;
  /** Grid sizing for the inner content area. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /** Rendered validation messages. */
  validationMessages?: ReactNode;
}

export function NumberLayout({
  value,
  formatting,
  icon,
  direction = 'horizontal',
  title,
  componentId,
  innerGrid,
  validationGrid,
  validationMessages,
}: NumberLayoutProps) {
  const { lang, langAsString } = useTranslation();

  if (isNaN(value)) {
    return null;
  }

  // Without a title, render just the bare DisplayNumber (no label, no structure wrapper)
  if (!title) {
    return <DisplayNumber value={value} formatting={formatting} />;
  }

  return (
    <span
      className={cn(
        classes.label,
        classes.numberComponent,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
      )}
    >
      <span id={componentId ? getLabelId(componentId) : undefined}>{lang(title)}</span>
      <ComponentStructure
        componentId={componentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={validationMessages}
      >
        <DisplayNumber
          value={value}
          iconUrl={icon}
          iconAltText={langAsString(title)}
          labelId={componentId ? getLabelId(componentId) : undefined}
          formatting={formatting}
        />
      </ComponentStructure>
    </span>
  );
}
