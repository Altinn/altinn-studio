import React, { useState } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { Chip } from '@digdir/design-system-react';
import { FormField } from '../../FormField';
import classes from './EditGrid.module.css';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { PadlockLockedFillIcon } from '@navikt/aksel-icons';

export enum ViewSizeForGridProp {
  S = 'xs',
  M = 'md',
}

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const getDefaultViewSize = (): ViewSizeForGridProp => {
    if (component.grid?.md) return ViewSizeForGridProp.M;
    if (component.grid?.xs) return ViewSizeForGridProp.S;
    return ViewSizeForGridProp.M;
  };
  const [viewSizeForGridProp, setViewSizeForGridProp] = useState<ViewSizeForGridProp>(
    getDefaultViewSize(),
  );

  const t = useText();

  const gridIsSetForViewSize = (viewSize: ViewSizeForGridProp): boolean =>
    viewSize === ViewSizeForGridProp.S ? !!component.grid?.xs : !!component.grid?.md;

  return (
    <FormField
      className={classes.gridContainer}
      id={component.id}
      value={component.grid}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={t('ux_editor.modal_properties_grid_help')}
      renderField={({ fieldProps }) => (
        <>
          <div className={classes.viewSizesContainer}>
            <Chip.Group size='small'>
              <Chip.Toggle
                selected={viewSizeForGridProp === ViewSizeForGridProp.S}
                onClick={() => setViewSizeForGridProp(ViewSizeForGridProp.S)}
              >
                {t('ux_editor.modal_properties_grid_size_xs')}
              </Chip.Toggle>
              <Chip.Toggle
                selected={viewSizeForGridProp === ViewSizeForGridProp.M}
                onClick={() => setViewSizeForGridProp(ViewSizeForGridProp.M)}
              >
                {t('ux_editor.modal_properties_grid_size_md')}
              </Chip.Toggle>
            </Chip.Group>
            {!gridIsSetForViewSize(viewSizeForGridProp) && (
              <PadlockLockedFillIcon fontSize='1.5rem' />
            )}
          </div>
          <EditGridForGivenViewSize
            {...fieldProps}
            viewSize={viewSizeForGridProp}
            useDefaultGridSize={!gridIsSetForViewSize(viewSizeForGridProp)}
            handleComponentChange={handleComponentChange}
            component={component}
          />
        </>
      )}
    />
  );
};
