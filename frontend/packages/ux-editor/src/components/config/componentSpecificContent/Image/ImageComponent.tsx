import React from 'react';
import Select from 'react-select';
import { selectStyles } from '../../../../utils/render';
import { FieldSet, TextField } from '@digdir/design-system-react';
import classes from './ImageComponent.module.css';
import { TextResource } from '../../../TextResource';
import { useText } from '../../../../hooks';
import { Label } from 'app-shared/components/Label';
import type { IGenericEditComponent } from '../../componentConfig';

export const ImageComponent = ({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent) => {
  const t = useText();
  const alignOptions = [
    {
      value: 'flex-start',
      label: t('ux_editor.modal_properties_image_placement_left'),
    },
    {
      value: 'center',
      label: t('ux_editor.modal_properties_image_placement_center'),
    },
    {
      value: 'flex-end',
      label: t('ux_editor.modal_properties_image_placement_right'),
    },
  ];

  const selectedPlacement = alignOptions.filter((x) => x.value === component.image?.align);
  const nbSrc = component.image?.src?.nb;

  const handlePlacementChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.align = e ? e.value : null;

    handleComponentChange(updatedComponent);
  };

  const handleWidthChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.width = e.target.value;

    handleComponentChange(updatedComponent);
  };

  const handleAltTextChange = (id: string) => {
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        altTextImg: id,
      },
    });
  };

  const handleSourceChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.src.nb = e.target.value;

    handleComponentChange(updatedComponent);
  };

  const placementSelectId = `image_placement-input-${component.id}`;

  return (
    <FieldSet className={classes.root}>
      <div>
        <TextField
          id={`image_nb_src-input-${component.id}`}
          label={t('ux_editor.modal_properties_image_src_value_label')}
          onChange={handleSourceChange}
          value={nbSrc}
        />
      </div>
      <TextResource
        handleIdChange={handleAltTextChange}
        label={t('ux_editor.modal_properties_image_alt_text_label')}
        textResourceId={component.textResourceBindings?.altTextImg}
        generateIdOptions={{
          componentId: component.id,
          layoutId: layoutName,
          textResourceKey: 'altTextImg',
        }}
      />
      <div className={classes.widthAndPlacement}>
        <div className={classes.widthContainer}>
          <TextField
            id={`image_width-input-${component.id}`}
            label={t('ux_editor.modal_properties_image_width_label')}
            onChange={handleWidthChange}
            value={component.image?.width}
          />
        </div>
        <div className={classes.placementContainer}>
          <Label htmlFor={placementSelectId}>
            {t('ux_editor.modal_properties_image_placement_label')}
          </Label>
          <Select
            styles={selectStyles}
            options={alignOptions}
            onChange={handlePlacementChange}
            value={selectedPlacement}
            isClearable={true}
            placeholder=''
            inputId={placementSelectId}
          />
        </div>
      </div>
      <div>
        <p>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href='https://docs.altinn.studio/app/development/ux/images/'
          >
            {t('ux_editor.modal_properties_image_read_more')}
          </a>
        </p>
      </div>
    </FieldSet>
  );
};
