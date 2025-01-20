import React, { useState } from 'react';
import { Alert, Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import type { FormComponent } from '../../types/FormComponent';
import { EditBooleanValue } from './editModal/EditBooleanValue';
import { EditNumberValue } from './editModal/EditNumberValue';
import { EditStringValue } from './editModal/EditStringValue';
import { useComponentPropertyLabel, useText } from '../../hooks';
import {
  PropertyTypes,
  propertyKeysToExcludeFromComponentConfig,
  getSupportedPropertyKeysForPropertyType,
} from '../../utils/component';
import { EditGrid } from './editModal/EditGrid';
import type { FormItem } from '../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';
import { useComponentPropertyDescription } from '../../hooks/useComponentPropertyDescription';
import classes from './FormComponentConfig.module.css';
import { RedirectToLayoutSet } from './editModal/RedirectToLayoutSet';
import { ChevronDownIcon, ChevronUpIcon, PlusCircleIcon, XMarkIcon } from '@studio/icons';
import { StudioButton, StudioCard, StudioProperty } from '@studio/components';
import { CollapsiblePropertyEditor } from './CollapsiblePropertyEditor';
import type { TranslationKey } from 'language/type';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormItem;
  handleComponentUpdate: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
}

export interface FormComponentConfigProps extends IEditFormComponentProps {
  schema: any;
  hideUnsupported?: boolean;
}

export const FormComponentConfig = ({
  schema,
  editFormId,
  component,
  handleComponentUpdate,
  hideUnsupported,
}: FormComponentConfigProps) => {
  const t = useText();
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyDescription = useComponentPropertyDescription();
  const [showOtherComponents, setShowOtherComponents] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  if (!schema?.properties) return null;

  const { properties } = schema;
  const { hasCustomFileEndings, grid, layoutSet } = properties;

  // Add any properties that have a custom implementation to this list so they are not duplicated in the generic view
  const customProperties = [
    'hasCustomFileEndings',
    'validFileEndings',
    'grid',
    'layoutSet',
    'children',
    'dataTypeIds',
    'target',
    'tableColumns',
    'overrides',
  ];

  const booleanPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.boolean],
    customProperties,
  );
  const stringPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.string],
    customProperties,
  );
  const numberPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.number, PropertyTypes.integer],
    customProperties,
  );
  const arrayPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.array],
    customProperties,
  );
  const objectPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.object],
    [...customProperties, 'source'],
  );

  const unsupportedPropertyKeys: string[] = Object.keys(properties).filter((key) => {
    return (
      !booleanPropertyKeys.includes(key) &&
      !stringPropertyKeys.includes(key) &&
      !numberPropertyKeys.includes(key) &&
      !arrayPropertyKeys.includes(key) &&
      !objectPropertyKeys.includes(key) &&
      !customProperties.includes(key) &&
      !propertyKeysToExcludeFromComponentConfig.includes(key)
    );
  });

  const defaultDisplayedBooleanKeys = booleanPropertyKeys.slice(0, 3);
  const restOfBooleanKeys = booleanPropertyKeys.slice(3);

  const renderIcon = showOtherComponents ? (
    <ChevronUpIcon className={classes.upIcon} />
  ) : (
    <ChevronDownIcon className={classes.downIcon} />
  );
  const rendertext = showOtherComponents
    ? t('ux_editor.component_other_properties_hide_many_settings')
    : t('ux_editor.component_other_properties_show_many_settings');

  return (
    <>
      {layoutSet && component['layoutSet'] && (
        <RedirectToLayoutSet selectedSubform={component['layoutSet']} />
      )}

      {!hideUnsupported && (
        <Heading level={3} size='xxsmall'>
          {t('ux_editor.component_other_properties_title')}
        </Heading>
      )}
      {/** Boolean fields, incl. expression type */}
      {defaultDisplayedBooleanKeys.map((propertyKey) => (
        <EditBooleanValue
          component={component}
          handleComponentChange={handleComponentUpdate}
          propertyKey={propertyKey}
          defaultValue={properties[propertyKey].default}
          key={propertyKey}
        />
      ))}
      {showOtherComponents &&
        restOfBooleanKeys.map((propertyKey) => (
          <EditBooleanValue
            component={component}
            handleComponentChange={handleComponentUpdate}
            propertyKey={propertyKey}
            defaultValue={properties[propertyKey].default}
            key={propertyKey}
          />
        ))}
      {restOfBooleanKeys.length > 0 && (
        <StudioProperty.Button
          className={classes.button}
          icon={renderIcon}
          onClick={() => setShowOtherComponents((prev) => !prev)}
          property={rendertext}
        />
      )}
      {grid && (
        <>
          {showGrid ? (
            <StudioCard>
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
      )}
      {/** String properties */}
      {stringPropertyKeys.map((propertyKey) => {
        const isSortOrder = propertyKey === 'sortOrder';
        const isLayout = propertyKey === 'layout';

        return (
          <CollapsiblePropertyEditor
            key={propertyKey}
            label={t(`ux_editor.component_properties.${propertyKey}` as TranslationKey)}
          >
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              helpText={isLayout || isSortOrder ? '' : properties[propertyKey]?.description}
              enumValues={properties[propertyKey]?.enum || properties[propertyKey]?.examples}
            />
          </CollapsiblePropertyEditor>
        );
      })}
      {/** Array properties with enum values) */}
      {arrayPropertyKeys.map((propertyKey) => {
        const isShowValidations = propertyKey === 'showValidations';
        const commonProps = {
          component,
          handleComponentChange: handleComponentUpdate,
          propertyKey,
          key: propertyKey,
          helpText: isShowValidations ? '' : properties[propertyKey]?.description,
          enumValues: properties[propertyKey]?.items?.enum,
          multiple: true,
        };
        return isShowValidations ? (
          <CollapsiblePropertyEditor
            key={propertyKey}
            label={t('ux_editor.component_properties.showValidations')}
          >
            <EditStringValue {...commonProps} />
          </CollapsiblePropertyEditor>
        ) : (
          <EditStringValue {...commonProps} />
        );
      })}
      {/** Number properties (number and integer types) */}
      {numberPropertyKeys.map((propertyKey) => {
        const isPreselectedOptionIndex = propertyKey === 'preselectedOptionIndex';
        const commonProps = {
          component,
          handleComponentChange: handleComponentUpdate,
          propertyKey,
          key: propertyKey,
          enumValues: properties[propertyKey]?.enum,
          helpText: isPreselectedOptionIndex
            ? t('ux_editor.component_properties.preselected_help_text')
            : undefined,
        };
        return isPreselectedOptionIndex ? (
          <CollapsiblePropertyEditor
            key={propertyKey}
            label={t('ux_editor.component_properties.preselectedOptionIndex_button')}
          >
            <EditNumberValue {...commonProps} />
          </CollapsiblePropertyEditor>
        ) : (
          <EditNumberValue {...commonProps} />
        );
      })}

      {/** Custom logic for custom file endings */}
      {hasCustomFileEndings && (
        <>
          <EditBooleanValue
            propertyKey='hasCustomFileEndings'
            component={component}
            defaultValue={hasCustomFileEndings.default}
            handleComponentChange={(updatedComponent: FormComponent) => {
              if (!updatedComponent.hasCustomFileEndings) {
                handleComponentUpdate({
                  ...updatedComponent,
                  validFileEndings: undefined,
                });
                return;
              }
              handleComponentUpdate(updatedComponent);
            }}
          />
          {component['hasCustomFileEndings'] && (
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey='validFileEndings'
            />
          )}
        </>
      )}

      {/** Object properties */}
      {objectPropertyKeys.map((propertyKey) => {
        return (
          <Card key={propertyKey} className={classes.objectPropertyContainer}>
            <Heading level={3} size='xxsmall'>
              {componentPropertyLabel(propertyKey)}
            </Heading>
            {properties[propertyKey]?.description && (
              <Paragraph size='small'>
                {componentPropertyDescription(propertyKey) ?? properties[propertyKey].description}
              </Paragraph>
            )}
            <FormComponentConfig
              key={propertyKey}
              schema={properties[propertyKey]}
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
          </Card>
        );
      })}
      {/* Show information about unsupported properties if there are any */}
      {unsupportedPropertyKeys.length > 0 && !hideUnsupported && (
        <Alert severity='info'>
          {t('ux_editor.edit_component.unsupported_properties_message')}
          <ul>
            {unsupportedPropertyKeys.length > 0 &&
              unsupportedPropertyKeys.map((propertyKey) => (
                <li key={propertyKey}>{propertyKey}</li>
              ))}
          </ul>
        </Alert>
      )}
    </>
  );
};
