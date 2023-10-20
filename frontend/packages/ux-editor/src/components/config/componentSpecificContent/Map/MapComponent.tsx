import React from 'react';
import { PlusIcon, XMarkIcon } from '@navikt/aksel-icons';
import { LegacyFieldSet, Button, LegacyTextField } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from '../../../FormField';
import { useText } from '../../../../hooks';
import { stringToArray, arrayToString } from '../../../../utils/stringUtils';
import classes from './MapComponent.module.css';
import type { FormMapLayer } from '../../../../types/FormComponent';

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
    <LegacyFieldSet className={classes.fieldSetContent}>
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
          >
            {({ onChange }) => (
              <LegacyTextField
                formatting={{ number: {} }}
                onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
              />
            )}
          </FormField>
          <FormField
            id={component.id}
            label={t('ux_editor.longitude_label')}
            value={component.centerLocation?.longitude}
            onChange={(value: number) => handleCenterLocationChange(value, 'longitude')}
            propertyPath={`${component.propertyPath}/properties/centerLocation/properties/longitude`}
            customValidationMessages={(errorCode: string) => {
              if (errorCode === 'type') return t('validation_errors.numbers_only');
            }}
          >
            {({ onChange }) => (
              <LegacyTextField
                formatting={{ number: {} }}
                onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
              />
            )}
          </FormField>
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
        >
          {({ onChange }) => (
            <LegacyTextField
              formatting={{ number: {} }}
              onChange={(e) => onChange(parseInt(e.target.value, 10), e)}
            />
          )}
        </FormField>
      </div>
      <div>
        <h2 className={classes.subTitle}>{t('ux_editor.add_map_layer')}</h2>
        <AddMapLayer component={component} handleComponentChange={handleComponentChange} />
      </div>
    </LegacyFieldSet>
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

  const updateLayer = (index: number, subdomains: string[]): FormMapLayer[] => {
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
          <LegacyFieldSet key={index} className={classes.fieldSet}>
            <div className={classes.layerHeaderContainer}>
              <p className={classes.numericLayerText}>
                {t('ux_editor.map_layer')} {index + 1}
              </p>
              <Button
                color='danger'
                icon={<XMarkIcon title={t('general.delete')} />}
                onClick={(): void => handleOnDeleteLayer(index)}
                variant='tertiary'
                size='small'
              />
            </div>
            <FormField
              id={component.id}
              label={t('ux_editor.url_label')}
              value={layer.url || ''}
              onChange={(value, event) => handleOnLayerChange(index, event)}
              propertyPath={`${component.propertyPath}/properties/layers/properties/url`}
              customValidationMessages={(errorCode: string) => {
                if (errorCode === 'format') return t('validation_errors.value_as_url');
              }}
            >
              {({ onChange }) => (
                <LegacyTextField name='url' onChange={(e) => onChange(e.target.value, e)} />
              )}
            </FormField>
            <div className={classes.formGroup}>
              <FormField
                id={component.id}
                label={t('ux_editor.attribution_label')}
                value={layer.attribution || ''}
                onChange={(value, event) => handleOnLayerChange(index, event)}
                propertyPath={`${component.propertyPath}/properties/layers/properties/attribution`}
              >
                {({ onChange }) => (
                  <LegacyTextField
                    name='attribution'
                    onChange={(e) => onChange(e.target.value, e)}
                  />
                )}
              </FormField>
              <FormField
                id={component.id}
                label={t('ux_editor.subdomains_label')}
                value={layer?.subdomains || []}
                onChange={(value: string[]) => handleOnSubDomainChange(index, value)}
                propertyPath={`${component.propertyPath}/properties/layers/properties/subdomains`}
              >
                {({ value, onChange }) => (
                  <LegacyTextField
                    name='subdomains'
                    placeholder={t('ux_editor.subdomains_placeholder')}
                    onChange={(e) => onChange(stringToArray(e.target.value), e)}
                    value={arrayToString(value) || ''}
                  />
                )}
              </FormField>
            </div>
          </LegacyFieldSet>
        ),
      )}
      <Button
        icon={<PlusIcon title={t('general.add')} />}
        variant='secondary'
        onClick={handleAddLayer}
        disabled={component.layers?.some((layer) => !layer.url)}
        fullWidth
        size='small'
      >
        {t('ux_editor.add_map_layer')}
      </Button>
    </>
  );
};
