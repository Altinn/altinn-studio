import React, { useState } from 'react';
import { useText } from '../../../hooks';
import { EditBooleanValue } from '../editModal/EditBooleanValue';
import { StudioProperty } from '@studio/components-legacy';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import classes from './ConfigBooleanProperties.module.css';
import { ConfigCustomFileEnding } from './ConfigCustomFileEnding';
import type { SchemaConfigProps } from './types';

export interface ConfigBooleanPropertiesProps extends SchemaConfigProps {
  booleanPropertyKeys: string[];
  defaultDisplayCount?: number;
}

export const ConfigBooleanProperties = ({
  booleanPropertyKeys,
  schema,
  component,
  handleComponentUpdate,
  defaultDisplayCount = 3,
}: ConfigBooleanPropertiesProps) => {
  const t = useText();
  const [showAll, setShowAll] = useState(false);
  const defaultDisplayedKeys = booleanPropertyKeys.slice(0, defaultDisplayCount);
  const additionalKeys = booleanPropertyKeys.slice(defaultDisplayCount);

  if (!booleanPropertyKeys.length) return null;

  const renderIcon = showAll ? (
    <ChevronUpIcon className={classes.upIcon} />
  ) : (
    <ChevronDownIcon className={classes.downIcon} />
  );

  const toggleText = showAll
    ? t('ux_editor.component_other_properties_hide_many_settings')
    : t('ux_editor.component_other_properties_show_many_settings');

  return (
    <>
      {defaultDisplayedKeys.map((propertyKey) => (
        <EditBooleanValue
          key={propertyKey}
          component={component}
          handleComponentChange={handleComponentUpdate}
          propertyKey={propertyKey}
          defaultValue={schema.properties[propertyKey]?.default}
        />
      ))}

      {/** Custom logic for custom file endings */}
      {schema.properties?.hasCustomFileEndings && (
        <ConfigCustomFileEnding
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      {/** Custom logic for custom file endings */}
      {showAll &&
        additionalKeys.map((propertyKey) => (
          <EditBooleanValue
            key={propertyKey}
            component={component}
            handleComponentChange={handleComponentUpdate}
            propertyKey={propertyKey}
            defaultValue={schema.properties[propertyKey]?.default}
          />
        ))}
      {additionalKeys.length > 0 && (
        <StudioProperty.Button
          className={classes.button}
          icon={renderIcon}
          onClick={() => setShowAll(!showAll)}
          property={toggleText}
        />
      )}
    </>
  );
};
