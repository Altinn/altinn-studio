import React, { useState } from 'react';
import { useText } from '../../../hooks';
import { EditGrid } from '../editModal/EditGrid';
import { StudioButton, StudioCard, StudioProperty } from '@studio/components-legacy';
import { PlusCircleIcon, XMarkIcon } from '@studio/icons';
import { Heading } from '@digdir/designsystemet-react';
import classes from './ConfigGridProperties.module.css';
import type { BaseConfigProps } from './types';

export interface ConfigGridPropertiesProps extends BaseConfigProps {}

export const ConfigGridProperties = ({
  component,
  handleComponentUpdate,
}: ConfigGridPropertiesProps) => {
  const [showGrid, setShowGrid] = useState(false);
  const t = useText();

  return (
    <>
      {showGrid ? (
        <StudioCard className={classes.objectPropertyContainer}>
          <StudioCard.Header className={classes.gridHeader}>
            <div className={classes.flexContainer}>
              <Heading size='xs' className={classes.heading}>
                {t('ux_editor.component_properties.grid')}
              </Heading>
              <StudioButton
                icon={<XMarkIcon />}
                onClick={() => setShowGrid(false)}
                title={t('general.close')}
                variant='secondary'
                className={classes.button}
              />
            </div>
          </StudioCard.Header>
          <StudioCard.Content>
            <EditGrid
              key={component.id}
              component={component}
              handleComponentChange={handleComponentUpdate}
            />
          </StudioCard.Content>
        </StudioCard>
      ) : (
        <StudioProperty.Button
          className={classes.gridButton}
          icon={<PlusCircleIcon />}
          onClick={() => setShowGrid(true)}
          property={t('ux_editor.component_properties.grid')}
        />
      )}
    </>
  );
};
