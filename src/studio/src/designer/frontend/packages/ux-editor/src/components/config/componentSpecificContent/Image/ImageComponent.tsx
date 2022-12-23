import React from 'react';
import Select from 'react-select';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { PropertyLabel, selectStyles } from '../../../../utils/render';
import type { FormComponentType, IFormImageComponent } from '../../../../types/global';
import { TextField } from '@altinn/altinn-design-system';
import classes from './ImageComponent.module.css';
import { TextResource } from '../../../TextResource';

export interface IImageComponentProps {
  component: IFormImageComponent;
  handleComponentUpdate: (updatedComponent: FormComponentType) => void;
  language: any;
}

export const ImageComponent = ({
  component,
  handleComponentUpdate,
  language,
}: IImageComponentProps) => {
  const t = (key: string) => getLanguageFromKey(key, language);
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

    handleComponentUpdate(updatedComponent);
  };

  const handleWidthChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.width = e.target.value;

    handleComponentUpdate(updatedComponent);
  };

  const handleAltTextChange = (id: string) => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.altTextImg = id;

    handleComponentUpdate(updatedComponent);
  };

  const handleSourceChange = (e: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.src.nb = e.target.value;

    handleComponentUpdate(updatedComponent);
  };

  const placementSelectId = `image_placement-input-${component.id}`;

  return (
    <>
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
          <PropertyLabel
            textKey={t('ux_editor.modal_properties_image_placement_label')}
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
    </>
  );
};
