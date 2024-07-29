import React from 'react';
import { PlusIcon, XMarkIcon } from '@studio/icons';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from '../../../FormField';
import { useText } from '../../../../hooks';
import { stringToArray, arrayToString } from '../../../../utils/stringUtils';
import classes from './MapComponent.module.css';
import type { MapLayer } from 'app-shared/types/MapLayer';
import { StudioButton, StudioProperty, StudioTextfield } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';

export const MapComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Map>): JSX.Element => {
  const t = useText();

  return (
    <div className={classes.addMapLayerContent}>
      <h2 className={classes.subTitle}>{t('ux_editor.add_map_layer')}</h2>
      <AddMapLayer component={component} handleComponentChange={handleComponentChange} />
    </div>
  );
};

interface AddMapLayerProps extends IGenericEditComponent<ComponentType.Map> {}

const AddMapLayer = ({ component, handleComponentChange }: AddMapLayerProps): JSX.Element => {
  const t = useText();

  const handleOnLayerChange = (index: number, event: React.ChangeEvent<HTMLInputElement>): void => {
    const layers = [...component.layers];
    layers[index][event.target.name] = event.target.value;
    handleComponentChange({
      ...component,
      layers,
    });
  };

  const handleOnSubDomainChange = (index: number, value: string[]): void => {
    const layers = updateLayer(index, value);
    handleComponentChange({
      ...component,
      layers,
    });
  };

  const updateLayer = (index: number, subdomains: string[]): MapLayer[] => {
    return [
      ...component.layers.slice(0, index),
      {
        ...component.layers[index],
        subdomains,
      },
      ...component.layers.slice(index + 1),
    ];
  };

  const handleAddLayer = (): void => {
    const layers = [...(component.layers || [])];
    layers.push({
      url: undefined,
      attribution: undefined,
      subdomains: undefined,
    });
    handleComponentChange({
      ...component,
      layers,
    });
  };

  const handleOnDeleteLayer = (index: number): void => {
    const layers = [...(component.layers || [])];
    layers.splice(index, 1);
    handleComponentChange({
      ...component,
      layers,
    });
  };

  return (
    <>
      {component.layers?.map(
        (layer, index): JSX.Element => (
          // Find a way to avoid using index as key
          <StudioProperty.Fieldset
            key={index}
            legend={t('ux_editor.map_layer') + (index + 1)}
            menubar={
              <StudioButton
                color='danger'
                icon={<XMarkIcon title={t('general.delete')} />}
                onClick={(): void => handleOnDeleteLayer(index)}
                variant='tertiary'
              />
            }
          >
            <div className={classes.formGroup}>
              <FormField
                id={component.id}
                label={t('ux_editor.url_label')}
                value={layer.url || ''}
                onChange={(value, event) => handleOnLayerChange(index, event)}
                propertyPath={`${component.propertyPath}/properties/layers/properties/url`}
                customValidationMessages={(errorCode: string) => {
                  if (errorCode === 'format') return t('validation_errors.value_as_url');
                }}
                renderField={({ fieldProps }) => (
                  <StudioTextfield
                    id={component.id}
                    label={t('ux_editor.url_label')}
                    value={fieldProps.value}
                    size='sm'
                    onChange={(e) => fieldProps.onChange(e.target.value, e)}
                    name='url'
                  />
                )}
              />
            </div>

            <div className={classes.formGroup}>
              <FormField
                id={component.id}
                label={t('ux_editor.attribution_label')}
                value={layer.attribution || ''}
                onChange={(value, event) => handleOnLayerChange(index, event)}
                propertyPath={`${component.propertyPath}/properties/layers/properties/attribution`}
                renderField={({ fieldProps }) => (
                  <StudioTextfield
                    id={component.id}
                    label={t('ux_editor.attribution_label')}
                    value={fieldProps.value}
                    size='sm'
                    name='attribution'
                    onChange={(e) => fieldProps.onChange(e.target.value, e)}
                  />
                )}
              />

              <FormField
                id={component.id}
                label={t('ux_editor.subdomains_label')}
                value={layer?.subdomains || []}
                onChange={(value: string[]) => handleOnSubDomainChange(index, value)}
                propertyPath={`${component.propertyPath}/properties/layers/properties/subdomains`}
                renderField={({ fieldProps }) => (
                  <StudioTextfield
                    id={component.id}
                    label={t('ux_editor.subdomains_label')}
                    name='subdomains'
                    placeholder={t('ux_editor.subdomains_placeholder')}
                    onChange={(e) => fieldProps.onChange(stringToArray(e.target.value), e)}
                    value={arrayToString(fieldProps.value) || ''}
                  />
                )}
              />
            </div>
          </StudioProperty.Fieldset>
        ),
      )}
      <StudioButton
        icon={<PlusIcon title={t('general.add')} />}
        variant='secondary'
        onClick={handleAddLayer}
        disabled={component.layers?.some((layer) => !layer.url)}
        fullWidth
      >
        {t('ux_editor.add_map_layer')}
      </StudioButton>
    </>
  );
};
