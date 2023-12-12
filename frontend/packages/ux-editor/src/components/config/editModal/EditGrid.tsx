import React, { useState } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { ToggleGroup } from '@digdir/design-system-react';
import { FormField } from '../../FormField';
import classes from './EditGrid.module.css';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';

export enum ViewSizeForGridProp {
  S = 'xs',
  M = 'md',
}

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const getDefaultViewSize = (): ViewSizeForGridProp => {
    if (component.grid?.md) return ViewSizeForGridProp.M;
    else if (component.grid?.xs) return ViewSizeForGridProp.S;
    else return ViewSizeForGridProp.M;
  };
  const [viewSizeForGridProp, setViewSizeForGridProp] = useState<ViewSizeForGridProp>(
    getDefaultViewSize(),
  );

  const t = useText();

  const gridIsSetForViewSize = (viewSize: ViewSizeForGridProp): boolean =>
    viewSize === ViewSizeForGridProp.S ? !!component.grid?.xs : !!component.grid?.md;

  return (
    <FormField
      id={component.id}
      value={component.grid}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={t('ux_editor.modal_properties_grid_help')}
      renderField={({ fieldProps }) => (
        <>
          <div className={classes.toggleGroupContainer}>
            <ToggleGroup
              defaultValue={viewSizeForGridProp}
              name='toggle-group-grid-size'
              onChange={(viewSize: ViewSizeForGridProp) => setViewSizeForGridProp(viewSize)}
              size='small'
            >
              <ToggleGroup.Item value={ViewSizeForGridProp.S}>
                {t('ux_editor.modal_properties_grid_size_xs')}
              </ToggleGroup.Item>
              <ToggleGroup.Item value={ViewSizeForGridProp.M}>
                {t('ux_editor.modal_properties_grid_size_md')}
              </ToggleGroup.Item>
            </ToggleGroup>
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
