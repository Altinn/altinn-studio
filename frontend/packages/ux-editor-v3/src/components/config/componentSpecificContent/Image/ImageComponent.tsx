import React from 'react';
import { Fieldset } from '@digdir/designsystemet-react';
import classes from './ImageComponent.module.css';
import { TextResource } from '../../../TextResource';
import { useText } from '../../../../hooks';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from '../../../FormField';
import { StudioNativeSelect, StudioTextfield } from '@studio/components-legacy';
import { altinnDocsUrl } from 'app-shared/ext-urls';

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

  const handlePlacementChange = (value) => {
    const updatedComponent = { ...component };
    updatedComponent.image.align = value;

    handleComponentChange(updatedComponent);
  };

  const handleWidthChange = (width: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.width = width;

    handleComponentChange(updatedComponent);
  };

  const handleAltTextChange = (altTextImg: string) => {
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        altTextImg: altTextImg,
      },
    });
  };

  const handleSourceChange = (src: any) => {
    const updatedComponent = { ...component };
    updatedComponent.image.src = src;

    handleComponentChange(updatedComponent);
  };

  const placementSelectId = `image_placement-input-${component.id}`;

  return (
    <Fieldset className={classes.root} legend={t('ux_editor.image_component.settings')} hideLegend>
      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_image_src_value_label')}
        onChange={handleSourceChange}
        value={nbSrc && { nb: nbSrc }}
        propertyPath={`${component.propertyPath}/properties/image/properties/src`}
        renderField={({ fieldProps }) => (
          <StudioTextfield
            {...fieldProps}
            name={`image_src-input-${component.id}`}
            onChange={(e) => fieldProps.onChange({ nb: e.target.value }, e)}
            value={fieldProps.value?.nb || ''}
          />
        )}
      />

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
        <FormField
          id={component.id}
          className={classes.widthContainer}
          label={t('ux_editor.modal_properties_image_width_label')}
          onChange={handleWidthChange}
          value={component.image?.width || ''}
          propertyPath={`${component.propertyPath}/properties/image/properties/width`}
          renderField={({ fieldProps }) => (
            <StudioTextfield
              {...fieldProps}
              name={`image_width-input-${component.id}`}
              onChange={(e) => fieldProps.onChange(e.target.value, e)}
            />
          )}
        />

        <FormField
          id={component.id}
          className={classes.placementContainer}
          label={t('ux_editor.modal_properties_image_placement_label')}
          onChange={handlePlacementChange}
          value={selectedPlacement?.[0]?.value}
          propertyPath={`${component.propertyPath}/properties/image/properties/align`}
          renderField={({ fieldProps }) => (
            <StudioNativeSelect {...fieldProps} id={placementSelectId}>
              {alignOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </StudioNativeSelect>
          )}
        />
      </div>
      <div>
        <p>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/reference/ux/components/image/' })}
          >
            {t('ux_editor.modal_properties_image_read_more')}
          </a>
        </p>
      </div>
    </Fieldset>
  );
};
