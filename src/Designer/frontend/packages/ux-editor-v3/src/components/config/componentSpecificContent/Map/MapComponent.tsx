import React, { type ChangeEvent } from 'react';
import { PlusIcon, XMarkIcon } from '@studio/icons';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from '../../../FormField';
import { useText } from '../../../../hooks';
import { stringToArray, arrayToString } from '../../../../utils/stringUtils';
import classes from './MapComponent.module.css';
import type { MapLayer } from 'app-shared/types/MapLayer';
import { StudioButton, StudioTextfield } from '@studio/components-legacy';
import { StudioProperty } from '@studio/components';

export const MapComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent): JSX.Element => {
  const t = useText();

  const handleCenterLocationChange = (value: number, propertyName: string): void => {
    handleComponentChange({
      ...component,
      centerLocation: { ...component.centerLocation, [propertyName]: value },
    });
  };

  const handleNumberInputChange = (value: number, propertyName: string): void => {
    handleComponentChange({
      ...component,
      [propertyName]: value || undefined,
    });
  };

  return (
    <StudioProperty.Fieldset legend={''} className={classes.fieldSetContent}>
      <div>
        <h2 className={classes.subTitle}>{t('ux_editor.center_location')}</h2>
        <div className={classes.formGroup}>
          <FormField
            id={component.id}
            label={t('ux_editor.latitude_label')}
            value={component.centerLocation?.latitude}
            onChange={(value: number) => handleCenterLocationChange(value, 'latitude')}
            propertyPath={`${component.propertyPath}/properties/centerLocation/properties/latitude`}
            customValidationMessages={(errorCode: string) => {
              if (errorCode === 'type') return t('validation_errors.numbers_only');
            }}
            renderField={({ fieldProps }) => (
              <StudioTextfield
                {...fieldProps}
                type='number'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  fieldProps.onChange(parseInt(e.target.value, 10), e)
                }
              />
            )}
          />

          <FormField
            id={component.id}
            label={t('ux_editor.longitude_label')}
            value={component.centerLocation?.longitude}
            onChange={(value: number) => handleCenterLocationChange(value, 'longitude')}
            propertyPath={`${component.propertyPath}/properties/centerLocation/properties/longitude`}
            customValidationMessages={(errorCode: string) => {
              if (errorCode === 'type') return t('validation_errors.numbers_only');
            }}
            renderField={({ fieldProps }) => (
              <StudioTextfield
                {...fieldProps}
                type='number'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  fieldProps.onChange(parseInt(e.target.value, 10), e)
                }
              />
            )}
          />
        </div>
      </div>

      <div>
        <FormField
          id={component.id}
          label={t('ux_editor.adjust_zoom')}
          value={component.zoom}
          onChange={(value: number) => handleNumberInputChange(value, 'zoom')}
          propertyPath={`${component.propertyPath}/properties/zoom`}
          customValidationMessages={(errorCode: string) => {
            if (errorCode === 'type') return t('validation_errors.numbers_only');
          }}
          renderField={({ fieldProps }) => (
            <StudioTextfield
              {...fieldProps}
              type='number'
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                fieldProps.onChange(parseInt(e.target.value, 10), e)
              }
            />
          )}
        />
      </div>
      <div>
        <h2 className={classes.subTitle}>{t('ux_editor.add_map_layer')}</h2>
        <AddMapLayer component={component} handleComponentChange={handleComponentChange} />
      </div>
    </StudioProperty.Fieldset>
  );
};

interface AddMapLayerProps extends IGenericEditComponent {}
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
        (
          layer: { url: string; attribution: string; subdomains: string },
          index: number,
        ): JSX.Element => (
          // Find a way to avoid using index as key
          <StudioProperty.Fieldset
            legend={t('ux_editor.map_layer') + (index + 1)}
            key={index}
            menubar={
              <StudioButton
                color='danger'
                icon={<XMarkIcon title={t('general.delete')} />}
                onClick={(): void => handleOnDeleteLayer(index)}
                variant='tertiary'
              />
            }
          >
            <FormField
              id={component.id}
              label={t('ux_editor.url_label')}
              value={layer.url || ''}
              onChange={(_value, event): void => handleOnLayerChange(index, event)}
              propertyPath={`${component.propertyPath}/properties/layers/properties/url`}
              customValidationMessages={(errorCode: string) => {
                if (errorCode === 'format') return t('validation_errors.value_as_url');
              }}
              renderField={({ fieldProps }) => (
                <StudioTextfield
                  {...fieldProps}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    fieldProps.onChange(e.target.value, e)
                  }
                  name='url'
                />
              )}
            />

            <div className={classes.formGroup}>
              <FormField
                id={component.id}
                label={t('ux_editor.attribution_label')}
                value={layer.attribution || ''}
                onChange={(_value, event) => handleOnLayerChange(index, event)}
                propertyPath={`${component.propertyPath}/properties/layers/properties/attribution`}
                renderField={({ fieldProps }) => (
                  <StudioTextfield
                    {...fieldProps}
                    name='attribution'
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      fieldProps.onChange(e.target.value, e)
                    }
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
                    {...fieldProps}
                    name='subdomains'
                    placeholder={t('ux_editor.subdomains_placeholder')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      fieldProps.onChange(stringToArray(e.target.value), e)
                    }
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
        disabled={component.layers?.some((layer: { url: string }): boolean => !layer.url)}
        fullWidth
      >
        {t('ux_editor.add_map_layer')}
      </StudioButton>
    </>
  );
};
