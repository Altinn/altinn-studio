import React, { useState } from 'react';
import { useComponentPropertyLabel, useText } from '../../../hooks';
import { StudioButton, StudioCard } from '@studio/components-legacy';
import { StudioProperty } from '@studio/components';
import { PlusCircleIcon, XMarkIcon } from 'libs/studio-icons/src';
import { Paragraph } from '@digdir/designsystemet-react';
import { FormComponentConfig } from '../FormComponentConfig';
import { useComponentPropertyDescription } from '../../../hooks/useComponentPropertyDescription';
import type { FormComponent } from '../../../types/FormComponent';
import classes from './ConfigObjectProperties.module.css';
import type { SchemaConfigProps } from './types';
import cn from 'classnames';

export interface ConfigObjectPropertiesProps extends SchemaConfigProps {
  objectPropertyKeys: string[];
  editFormId: string;
  className?: string;
}

export const ConfigObjectProperties = ({
  objectPropertyKeys,
  schema,
  component,
  editFormId,
  handleComponentUpdate,
  className,
}: ConfigObjectPropertiesProps) => {
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyDescription = useComponentPropertyDescription();
  const [openObjectCards, setOpenObjectCards] = useState<Record<string, boolean>>({});
  const t = useText();

  const toggleObjectCard = (propertyKey: string) => {
    setOpenObjectCards((prev) => ({
      ...prev,
      [propertyKey]: !prev[propertyKey],
    }));
  };

  return (
    <>
      {objectPropertyKeys.map((propertyKey) => {
        const isOpen = openObjectCards[propertyKey] || false;
        return (
          <div key={propertyKey}>
            {isOpen ? (
              <StudioCard>
                <div className={classes.flexContainer}>
                  <StudioCard.Header className={classes.gridHeader} data-size='md'>
                    {componentPropertyLabel(propertyKey)}
                  </StudioCard.Header>
                  <StudioButton
                    icon={<XMarkIcon />}
                    onClick={() => toggleObjectCard(propertyKey)}
                    title={t('general.close')}
                    variant='secondary'
                  />
                </div>
                <StudioCard.Content>
                  {componentPropertyDescription(propertyKey) && (
                    <Paragraph size='small'>{componentPropertyDescription(propertyKey)}</Paragraph>
                  )}
                  <FormComponentConfig
                    schema={schema.properties[propertyKey] || {}}
                    component={component[propertyKey] || {}}
                    handleComponentUpdate={(updatedComponent: FormComponent) => {
                      handleComponentUpdate({
                        ...component,
                        [propertyKey]: updatedComponent,
                      });
                    }}
                    editFormId={editFormId}
                    hideUnsupported
                  />
                </StudioCard.Content>
              </StudioCard>
            ) : (
              <StudioProperty.Button
                className={cn(classes.gridButton, className)}
                icon={<PlusCircleIcon />}
                onClick={() => toggleObjectCard(propertyKey)}
                property={componentPropertyLabel(propertyKey)}
              />
            )}
          </div>
        );
      })}
    </>
  );
};
