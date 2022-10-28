import React from 'react';
import { Grid, Typography } from '@mui/material';
import Select from 'react-select';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey } from 'app-shared/utils/language';
import {
  PropertyLabel,
  selectStyles,
  SelectTextFromRecources,
} from '../../utils/render';
import type {
  FormComponentType,
  IFormImageComponent,
} from '../../types/global';

export interface IImageComponentProps {
  component: IFormImageComponent;
  handleComponentUpdate: (updatedComponent: FormComponentType) => void;
  language: any;
  textResources: any;
}

export const ImageComponent = ({
  component,
  language,
  handleComponentUpdate,
  textResources,
}: IImageComponentProps) => {
  const alignOptions = [
    {
      value: 'flex-start',
      label: language.ux_editor.modal_properties_image_placement_left,
    },
    {
      value: 'center',
      label: language.ux_editor.modal_properties_image_placement_center,
    },
    {
      value: 'flex-end',
      label: language.ux_editor.modal_properties_image_placement_right,
    },
  ];

  const selectedPlacement = alignOptions.filter(
    (x) => x.value === component.image?.align,
  );
  const nbSrc = component.image?.src?.nb;

  const handlePlacementChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.align = e ? e.value : null;

    handleComponentUpdate(updatedComponent);
  };

  const handleWidthChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.width = e.target.value;

    handleComponentUpdate(updatedComponent);
  };

  const handleAltTextChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.altTextImg = e ? e.value : null;

    handleComponentUpdate(updatedComponent);
  };

  const handleSourceChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.src.nb = e.target.value;

    handleComponentUpdate(updatedComponent);
  };

  const placementSelectId = `image_placement-input-${component.id}`;
  const altTextSelectId = `image_alt-input-${component.id}`;

  return (
    <Grid spacing={2} container={true} data-testid='ImageComponent'>
      <Grid item={true} xs={12}>
        <AltinnInputField
          id={`image_nb_src-${component.id}`}
          textFieldId={`image_nb_src-input-${component.id}`}
          inputValue={nbSrc}
          inputDescription={
            language.ux_editor.modal_properties_image_src_value_label
          }
          inputFieldStyling={{ width: '100%' }}
          onChangeFunction={handleSourceChange}
        />
      </Grid>

      <Grid item={true} xs={12}>
        <SelectTextFromRecources
          labelText={'modal_properties_image_alt_text_label'}
          textResources={textResources}
          onChangeFunction={handleAltTextChange}
          language={language}
          selected={component.textResourceBindings?.altTextImg}
          placeholder={component.textResourceBindings?.altTextImg}
          inputId={altTextSelectId}
        />
      </Grid>

      <Grid item={true} xs={3}>
        <AltinnInputField
          id={`image_width-${component.id}`}
          textFieldId={`image_width-input-${component.id}`}
          inputValue={component.image?.width}
          inputDescription={
            language.ux_editor.modal_properties_image_width_label
          }
          inputFieldStyling={{ width: '100%' }}
          onChangeFunction={handleWidthChange}
        />
      </Grid>

      <Grid item={true} xs={9}>
        <PropertyLabel
          textKey={language.ux_editor.modal_properties_image_placement_label}
          htmlFor={placementSelectId}
        />
        <Select
          styles={selectStyles}
          options={alignOptions}
          onChange={handlePlacementChange}
          defaultValue={selectedPlacement}
          isClearable={true}
          placeholder=''
          inputId={placementSelectId}
        />
      </Grid>

      <Grid item={true} xs={12}>
        <Typography>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href='https://docs.altinn.studio/app/development/ux/images/'
          >
            {getLanguageFromKey(
              'ux_editor.modal_properties_image_read_more',
              language,
            )}
          </a>
        </Typography>
      </Grid>
    </Grid>
  );
};
