import React from 'react';
import { Textfield, Fieldset } from '@digdir/designsystemet-react';
import { LegacySelect } from '@digdir/design-system-react';
import classes from './ImageComponent.module.css';
import { useText } from '../../../../hooks';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from '../../../FormField';
import type { ComponentType } from 'app-shared/types/ComponentType';

export const ImageComponent = ({
  component,
  handleComponentChange,
  layoutName,
}: IGenericEditComponent<ComponentType.Image>) => {
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

  const handlePlacementChange = (align: string) => {
    const updatedComponent = { ...component };
    updatedComponent.image.align = align;

    handleComponentChange(updatedComponent);
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
          <Textfield
            {...fieldProps}
            name={`image_src-input-${component.id}`}
            onChange={(e) => fieldProps.onChange({ nb: e.target.value }, e)}
            value={fieldProps.value?.nb || ''}
          />
        )}
      />

      <div className={classes.widthAndPlacement}>
        <FormField
          id={component.id}
          className={classes.placementContainer}
          label={t('ux_editor.modal_properties_image_placement_label')}
          onChange={handlePlacementChange}
          value={selectedPlacement?.[0]?.value}
          propertyPath={`${component.propertyPath}/properties/image/properties/align`}
          renderField={({ fieldProps }) => (
            <LegacySelect {...fieldProps} options={alignOptions} inputId={placementSelectId} />
          )}
        />
      </div>
      <div>
        <p>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href='https://docs.altinn.studio/nb/app/development/ux/components/images/'
          >
            {t('ux_editor.modal_properties_image_read_more')}
          </a>
        </p>
      </div>
    </Fieldset>
  );
};
