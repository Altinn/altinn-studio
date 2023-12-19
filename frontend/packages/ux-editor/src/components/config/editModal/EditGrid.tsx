import React, { useState, ReactNode } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { Tabs } from '@digdir/design-system-react';
import classes from './EditGrid.module.css';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { LaptopIcon, MobileSmallIcon } from '@navikt/aksel-icons';
import { FormComponent } from '../../../types/FormComponent';
import { deepCopy } from 'app-shared/pure';

export enum ViewSizeForGridProp {
  S = 'xs',
  M = 'md',
}

export interface GridSizeForViewSize {
  xs?: number;
  md?: number;
}

const getIconForViewSize = (viewSize: ViewSizeForGridProp): ReactNode => {
  const iconMapping = {
    [ViewSizeForGridProp.S]: <MobileSmallIcon />,
    [ViewSizeForGridProp.M]: <LaptopIcon />,
  };
  return iconMapping[viewSize] || null;
};

const setGridOnComponent = (gridValues: GridSizeForViewSize, component: FormComponent) => {
  const newComponent = deepCopy(component);
  newComponent.grid = { ...newComponent.grid, ...gridValues };
  if (
    Object.keys(newComponent.grid).length === 0 ||
    Object.values(newComponent.grid).every((value) => value === undefined)
  ) {
    delete newComponent.grid;
  }
  return newComponent;
};

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const [gridValues, setGridValues] = useState<GridSizeForViewSize>(component.grid ?? {});
  const [selectedViewSizeForGridProp, setSelectedViewSizeForGridProp] =
    useState<ViewSizeForGridProp>(ViewSizeForGridProp.S);
  const t = useText();

  const handleUpdateGrid = (newGridValues: GridSizeForViewSize) => {
    const updatedComponent = setGridOnComponent(newGridValues, component);
    setGridValues(newGridValues);
    handleComponentChange(updatedComponent);
  };

  return (
    <Tabs
      className={classes.gridContainer}
      key={component.id}
      defaultValue={selectedViewSizeForGridProp}
      onChange={(viewSize: ViewSizeForGridProp) => setSelectedViewSizeForGridProp(viewSize)}
      size='small'
    >
      <Tabs.List className={classes.viewSizesTabs}>
        {Object.values(ViewSizeForGridProp).map((viewSize: ViewSizeForGridProp) => {
          return (
            <Tabs.Tab key={viewSize} value={viewSize} icon={getIconForViewSize(viewSize)}>
              {t(`ux_editor.modal_properties_grid_size_${viewSize}`)}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
      {Object.values(ViewSizeForGridProp).map((viewSize: ViewSizeForGridProp) => {
        return (
          <Tabs.Content key={viewSize} value={viewSize}>
            <EditGridForGivenViewSize
              handleUpdateGrid={(newGridValues: GridSizeForViewSize) =>
                handleUpdateGrid(newGridValues)
              }
              gridValues={gridValues}
              viewSize={viewSize}
            />
          </Tabs.Content>
        );
      })}
    </Tabs>
  );
};
