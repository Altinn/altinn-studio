import React from 'react';
import { Add, Delete } from '@navikt/ds-icons';
import {
  FieldSet,
  TextField,
  Button,
  ButtonVariant,
  ButtonColor
} from '@altinn/altinn-design-system';
import type { IGenericEditComponent } from '../../componentConfig';
import { TextFieldWithValidation } from '../../../TextFieldWithValidation';
import { useText } from '../../../../hooks';
import { stringToArray, arrayToString } from '../../../../utils/stringUtils';
import classes from './MapComponent.module.css';

export interface MapComponentProps extends IGenericEditComponent {}
export const MapComponent = ({
  component,
  handleComponentChange
}: MapComponentProps): JSX.Element => {
  const t = useText();

  const handleCenterLocationChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    handleComponentChange({
      ...component,
      centerLocation: { ...component.centerLocation, [event.target.name]: event.target.value }
    });
  };

  const handleNumberInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const parsedValue = parseInt(event.target.value, 10);
    handleComponentChange({
      ...component,
      [event.target.name]: parsedValue || undefined
    });
  };

  return (
    <FieldSet>
      <h2 className={classes.subTitle}>{t('ux_editor.center_location')}</h2>
      <div className={classes.formGroup}>
        <div>
          <TextFieldWithValidation
            label={t('ux_editor.latitude_label')}
            name='latitude'
            value={component.centerLocation?.latitude}
            inputMode='numeric'
            className={classes.textField}
            validation={{
              required: {
                message: t('validation_errors.required')
              },
              valueAsNumber: {
                message: t('validation_errors.numbers_only')
              }
            }}
            onChange={handleCenterLocationChange}
          />
        </div>
        <div>
          <TextFieldWithValidation
            label={t('ux_editor.longitude_label')}
            name='longitude'
            value={component.centerLocation?.longitude}
            className={classes.textField}
            inputMode='numeric'
            validation={{
              required: {
                message: t('validation_errors.required')
              },
              valueAsNumber: {
                message: t('validation_errors.numbers_only')
              }
            }}
            onChange={handleCenterLocationChange}
          />
        </div>
      </div>

      <TextFieldWithValidation
        label={t('ux_editor.adjust_zoom')}
        name='zoom'
        value={component.zoom}
        inputMode='numeric'
        validation={{
          valueAsNumber: {
            message: t('validation_errors.numbers_only')
          }
        }}
        className={classes.textField}
        onChange={handleNumberInputChange}
      />

      <h2 className={classes.subTitle}>{t('ux_editor.add_map_layer')}</h2>
      <AddMapLayer component={component} handleComponentChange={handleComponentChange} />
    </FieldSet>
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
      layers
    });
  };

  const handleOnSubDomainChange = (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const layers = [...component.layers];
    layers[index][event.target.name] = stringToArray(event.target.value);
    handleComponentChange({
      ...component,
      layers
    });
  };

  const handleAddLayer = (): void => {
    const layers = [...(component.layers || [])];
    layers.push({
      url: undefined,
      attattribution: undefined,
      subdomains: undefined
    });
    handleComponentChange({
      ...component,
      layers
    });
  };

  const handleOnDeleteLayer = (index: number): void => {
    const layers = [...(component.layers || [])];
    layers.splice(index, 1);
    handleComponentChange({
      ...component,
      layers
    });
  };

  return (
    <>
      {component.layers?.map(
        (layer, index): JSX.Element => (
          // Find a way to avoid using index as key
          <FieldSet key={index} className={classes.fieldSet}>
            <div className={classes.layerHeaderContainer}>
              <p className={classes.numericLayerText}>
                {t('ux_editor.map_layer')} {index + 1}
              </p>
              <Button
                color={ButtonColor.Danger}
                icon={<Delete />}
                onClick={(): void => handleOnDeleteLayer(index)}
                variant={ButtonVariant.Quiet}
              />
            </div>
            <TextFieldWithValidation
              name='url'
              label={t('ux_editor.url_label')}
              className={classes.fullWidth}
              validation={{
                required: { message: t('validation_errors.required') },
                valueAsUrl: { message: t('validation_errors.value_as_url') }
              }}
              value={layer.url}
              onChange={(event) => handleOnLayerChange(index, event)}
            />
            <div className={classes.formGroup}>
              <div>
                <TextField
                  name='attribution'
                  label={t('ux_editor.attribution_label')}
                  value={layer.attribution}
                  onChange={(event) => handleOnLayerChange(index, event)}
                />
              </div>
              <div>
                <TextField
                  name='subdomains'
                  label={t('ux_editor.subdomains_label')}
                  value={arrayToString(layer.subdomains)}
                  placeholder={t('ux_editor.subdomains_placeholder')}
                  onChange={(event) => handleOnSubDomainChange(index, event)}
                />
              </div>
            </div>
          </FieldSet>
        )
      )}
      <Button
        className={classes.spacing}
        icon={<Add />}
        variant={ButtonVariant.Outline}
        onClick={handleAddLayer}
        disabled={component.layers?.some((layer) => !layer.url)}
        fullWidth
      >
        {t('ux_editor.add_map_layer')}
      </Button>
    </>
  );
};
