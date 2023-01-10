import React from 'react';
import { Add } from '@navikt/ds-icons';
import { FieldSet, TextField, Button, ButtonVariant } from '@altinn/altinn-design-system';
import classes from './MapComponent.module.css';
import type { IGenericEditComponent } from '../../componentConfig';
import { TextFieldWithValidation } from '../../../TextFieldWithValidation';
import { useText } from '../../../../hooks';

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

  const handleOnLayerChange = (index: number, event: React.ChangeEvent<HTMLInputElement>): void => {
    const layers = [...component.layers];
    layers[index][event.target.name] = event.target.value;
    handleComponentChange({
      ...component,
      layers
    });
  };

  const handleAddLayer = () => {
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
            onChange={(event) => handleCenterLocationChange(event)}
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
            onChange={(event) => handleCenterLocationChange(event)}
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
      {component.layers?.map(
        (layer, index): JSX.Element => (
          <FieldSet className={classes.spacing} legend={`${t('ux_editor.map_layer')} ${index + 1}`}>
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
                  value={layer.subdomains}
                  onChange={(event) => handleOnLayerChange(index, event)}
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
        fullWidth
      >
        {t('ux_editor.add_map_layer')}
      </Button>
    </FieldSet>
  );
};
