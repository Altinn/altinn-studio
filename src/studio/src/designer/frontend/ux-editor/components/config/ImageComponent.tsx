import { Grid } from '@material-ui/core';
import * as React from 'react';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import Select from 'react-select';

import { renderSelectTextFromResources, renderPropertyLabel, selectStyles } from '../../utils/render';

type ImageComponentProps = {
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
}
  : ImageComponentProps) => {
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

  const selectedPlacement = alignOptions.filter((x) => x.value === component.image?.align);
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

  return (
    <Grid
      spacing={2}
      container={true}
    >
      <Grid
        item={true}
        xs={12}
      >
        <AltinnInputField
          id='image_nb_src'
          inputValue={nbSrc}
          inputDescription={language.ux_editor.modal_properties_image_src_value_label}
          inputFieldStyling={{ width: '100%' }}
          onChangeFunction={handleSourceChange}
        />
      </Grid>

      <Grid
        item={true}
        xs={12}
      >
        <div data-testid='image-alt-text-select'>
          {renderSelectTextFromResources(
            'modal_properties_image_alt_text_label',
            handleAltTextChange,
            textResources,
            language,
            component.textResourceBindings?.altTextImg,
            component.textResourceBindings?.altTextImg,
          )}
        </div>
      </Grid>

      <Grid
        item={true}
        xs={3}
      >
        <AltinnInputField
          id='image_width'
          inputValue={component.image?.width}
          inputDescription={language.ux_editor.modal_properties_image_width_label}
          onChangeFunction={handleWidthChange}
          inputFieldStyling={{ width: '100%' }}
        />
      </Grid>

      <Grid
        item={true}
        xs={9}
      >
        <div data-testid='image-placement-select'>
          {renderPropertyLabel(language.ux_editor.modal_properties_image_placement_label)}
          <Select
            styles={selectStyles}
            options={alignOptions}
            onChange={handlePlacementChange}
            defaultValue={selectedPlacement}
            isClearable={true}
            placeholder=''
          />
        </div>
      </Grid>
    </Grid>);
};
