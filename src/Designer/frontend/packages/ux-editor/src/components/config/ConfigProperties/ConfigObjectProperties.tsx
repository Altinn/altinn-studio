import React, { useState } from 'react';
import { useComponentPropertyLabel, useText } from '../../../hooks';
import { StudioButton, StudioProperty, StudioCard } from '@studio/components';
import { PlusCircleIcon, XMarkIcon } from '@studio/icons';
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
                <StudioCard.Block data-size='md'>
                  <div className={classes.flexContainer}>
                    {componentPropertyLabel(propertyKey)}
                    <StudioButton
                      icon={<XMarkIcon />}
                      onClick={() => toggleObjectCard(propertyKey)}
                      title={t('general.close')}
                      variant='secondary'
                    />
                  </div>
                  <div className={classes.descriptionContainer}>
                    {componentPropertyDescription(propertyKey) && (
                      <Paragraph size='small'>
                        {componentPropertyDescription(propertyKey)}
                      </Paragraph>
                    )}
                  </div>

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
                </StudioCard.Block>
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
