import { useText } from '../../../../hooks';
import type { IGenericEditComponent } from '../../componentConfig';
import { FormField } from 'app-shared/components/FormField';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { StudioFieldset, StudioSelect, StudioTextfield } from '@studio/components';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import type {
  GridJustification,
  IImageSrc,
} from '@app/layout-contract/generated/components/Image/serialized.generated';

import type { JSX } from 'react';

type ImageComponentProps = IGenericEditComponent<ComponentType.Image> & {
  className?: string;
};

export const ImageComponent = ({
  component,
  handleComponentChange,
  className,
}: ImageComponentProps): JSX.Element => {
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

  const handlePlacementChange = (align: GridJustification) => {
    const updatedComponent = { ...component };
    updatedComponent.image.align = align;

    handleComponentChange(updatedComponent);
  };

  const handleSourceChange = (src: IImageSrc) => {
    const updatedComponent = { ...component };
    updatedComponent.image.src = src;

    handleComponentChange(updatedComponent);
  };

  const placementSelectId = `image_placement-input-${component.id}`;

  return (
    <StudioFieldset
      className={className}
      legend={t('ux_editor.image_component.settings')}
      hideLegend
    >
      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_image_src_value_label')}
        onChange={handleSourceChange}
        value={nbSrc && { nb: nbSrc }}
        renderField={({ fieldProps }) => (
          <StudioTextfield
            {...fieldProps}
            name={`image_src-input-${component.id}`}
            onChange={(e) => fieldProps.onChange({ nb: e.target.value }, e)}
            value={fieldProps.value?.nb || ''}
          />
        )}
      />
      <FormField
        id={component.id}
        label={t('ux_editor.modal_properties_image_placement_label')}
        onChange={(value) => handlePlacementChange(value as GridJustification)}
        value={selectedPlacement?.[0]?.value}
        renderField={({ fieldProps }) => (
          <StudioSelect
            label={fieldProps.label}
            onChange={(e) => fieldProps.onChange(e.target.value)}
            value={fieldProps.value}
            id={placementSelectId}
          >
            {alignOptions.map((option) => (
              <StudioSelect.Option key={option.value} value={option.value}>
                {option.label}
              </StudioSelect.Option>
            ))}
          </StudioSelect>
        )}
      />

      <div>
        <p>
          <a
            target='_blank'
            rel='noopener noreferrer'
            href={altinnDocsUrl({ relativeUrl: 'altinn-studio/v8/reference/ux/components/image/' })}
          >
            {t('ux_editor.modal_properties_image_read_more')}
          </a>
        </p>
      </div>
    </StudioFieldset>
  );
};
