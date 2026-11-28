import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@designer/components';
import { DatabaseIcon } from '@designer/icons';
import type { LayoutComponent } from '../../types';
import { getChildComponents } from '../../utils/layoutUtils';
import { getCategory } from '../../utils/likertUtils';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import classes from './BindingLine.module.css';
import likertClasses from './LikertBindingLine.module.css';

export type LikertBindingLineProps = {
  component: LayoutComponent;
};

/**
 * Where the answers of a Likert table are saved, in one line, in the place every question in the
 * builder says where it saves. The answers arrive when the form is filled in, under the table's
 * category, so the line says that rather than naming fields.
 */
export function LikertBindingLine({ component }: LikertBindingLineProps): ReactElement {
  const { t } = useTranslation();
  const { layout } = usePageEditing();
  const { setOpenSettings } = useCanvasState();
  const count = getChildComponents(layout, component).length;

  return (
    <div className={classes.bindingLine} role='status'>
      <DatabaseIcon aria-hidden className={classes.icon} />
      <span className={likertClasses.text}>
        {t('app_builder.likert.strip_line', { count, category: getCategory(component) })}
      </span>
      <StudioButton variant='tertiary' data-size='sm' onClick={() => setOpenSettings('component')}>
        {t('app_builder.likert.show_fields')}
      </StudioButton>
    </div>
  );
}
