import { Fragment } from 'react';
import { EditComponentId } from './editModal/EditComponentId';
import { StudioHeading, StudioParagraph, StudioAlert } from '@studio/components';
import type { FormComponent } from '../../types/FormComponent';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { EditDataModelBindings } from './editModal/EditDataModelBindings';
import { EditTextResourceBindings } from './editModal/EditTextResourceBindings';
import { EditBooleanValue } from './editModal/EditBooleanValue';
import { EditNumberValue } from './editModal/EditNumberValue';
import { EditOptions } from './editModal/EditOptions';
import { EditStringValue } from './editModal/EditStringValue';
import { useSelector } from 'react-redux';
import { useText } from '../../hooks';
import { getComponentPropertyLabel } from '../../utils/language';
import { getUnsupportedPropertyTypes } from '../../utils/component';
import { EditGrid } from './editModal/EditGrid';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormComponent;
  handleComponentUpdate: (component: FormComponent) => void;
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
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const t = useText();

  if (!schema?.properties) return null;

  const {
    textResourceBindings,
    dataModelBindings,
    required,
    readOnly,
    id,
    type,
    options,
    optionsId,
    hasCustomFileEndings,
    validFileEndings,
    children,
    grid,
    ...rest
  } = schema.properties;

  // children property is not supported in component config - it should be part of container config.
  const unsupportedPropertyKeys: string[] = getUnsupportedPropertyTypes(
    rest,
    children ? ['children'] : undefined,
  );
  return (
    <>
      {id && (
        <EditComponentId
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          helpText={id.description}
        />
      )}
      {textResourceBindings?.properties && (
        <>
          <StudioHeading level={3} data-size='xs'>
            {t('general.text')}
          </StudioHeading>
          <EditTextResourceBindings
            component={component}
            handleComponentChange={handleComponentUpdate}
            textResourceBindingKeys={Object.keys(textResourceBindings.properties)}
            editFormId={editFormId}
            layoutName={selectedLayout}
          />
        </>
      )}
      {dataModelBindings?.properties && (
        <>
          <StudioHeading level={3} data-size='xs'>
            {t('top_menu.data_model')}
          </StudioHeading>
          {Object.keys(dataModelBindings?.properties).map((propertyKey: any) => {
            return (
              <EditDataModelBindings
                key={`${component.id}-data-model-${propertyKey}`}
                component={component}
                handleComponentChange={handleComponentUpdate}
                editFormId={editFormId}
                helpText={dataModelBindings?.properties[propertyKey]?.description}
                renderOptions={{
                  key: propertyKey,
                  label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
                }}
              />
            );
          })}
        </>
      )}
      {grid && (
        <div>
          <StudioHeading level={3} data-size='xs'>
            {t('ux_editor.component_properties.grid')}
          </StudioHeading>
          <EditGrid
            key={component.id}
            component={component}
            handleComponentChange={handleComponentUpdate}
          />
        </div>
      )}
      {!hideUnsupported && (
        <StudioHeading level={3} data-size='xs'>
          {t('ux_editor.component_other_properties_title')}
        </StudioHeading>
      )}
      {options && optionsId && (
        <EditOptions
          component={component as any}
          editFormId={editFormId}
          handleComponentChange={handleComponentUpdate}
        />
      )}

      {hasCustomFileEndings && (
        <>
          <EditBooleanValue
            propertyKey='hasCustomFileEndings'
            helpText={hasCustomFileEndings.description}
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
              helpText={validFileEndings?.description}
            />
          )}
        </>
      )}

      {readOnly && (
        <EditBooleanValue
          propertyKey='readOnly'
          helpText={readOnly.description}
          component={component}
          handleComponentChange={handleComponentUpdate}
          defaultValue={readOnly.default}
        />
      )}
      {required && (
        <EditBooleanValue
          propertyKey='required'
          helpText={required.description}
          component={component}
          handleComponentChange={handleComponentUpdate}
          defaultValue={required.default}
        />
      )}

      {Object.keys(rest).map((propertyKey) => {
        if (!rest[propertyKey]) return null;
        if (
          rest[propertyKey].type === 'boolean' ||
          rest[propertyKey].$ref?.endsWith('layout/expression.schema.v1.json#/definitions/boolean')
        ) {
          return (
            <EditBooleanValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
              defaultValue={rest[propertyKey]?.default}
            />
          );
        }
        if (rest[propertyKey].type === 'number' || rest[propertyKey].type === 'integer') {
          return (
            <EditNumberValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
            />
          );
        }
        if (rest[propertyKey].type === 'string') {
          return (
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
              enumValues={rest[propertyKey]?.enum}
            />
          );
        }
        if (rest[propertyKey].type === 'array' && rest[propertyKey].items?.type === 'string') {
          return (
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
              enumValues={rest[propertyKey]?.items?.enum}
              multiple={true}
            />
          );
        }
        if (rest[propertyKey].type === 'object' && rest[propertyKey].properties) {
          return (
            <Fragment key={propertyKey}>
              <StudioHeading level={3} data-size='xs'>
                {getComponentPropertyLabel(propertyKey, t)}
              </StudioHeading>
              {rest[propertyKey]?.description && (
                <StudioParagraph data-size='sm'>{rest[propertyKey].description}</StudioParagraph>
              )}
              <FormComponentConfig
                key={propertyKey}
                schema={rest[propertyKey]}
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
            </Fragment>
          );
        }
        return null;
      })}
      {/* Show information about unsupported properties if there are any */}
      {unsupportedPropertyKeys.length > 0 && !hideUnsupported && (
        <StudioAlert data-color='info'>
          {t('ux_editor.edit_component.unsupported_properties_message')}
          <ul>
            {unsupportedPropertyKeys.length > 0 &&
              unsupportedPropertyKeys.map((propertyKey) => (
                <li key={propertyKey}>{propertyKey}</li>
              ))}
          </ul>
        </StudioAlert>
      )}
    </>
  );
};
