import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/ImageUpload.schema.v1.json';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';
import { ConfigNumberProperties } from '@altinn/ux-editor/components/config/ConfigProperties';

type ImageUploadMainProperties = (keyof typeof properties)[];
const imageUploadStringProperties: ImageUploadMainProperties = ['cropShape'];
const imageUploadNumberProperties: ImageUploadMainProperties = ['cropHeight', 'cropWidth'];
type FileUploadMainConfigProps = {
  component: FormItem<ComponentType.ImageUpload>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const ImageUploadMainConfig = ({
  component,
  handleComponentChange,
  className,
}: FileUploadMainConfigProps): React.ReactElement => {
  const { data: schema } = useComponentSchemaQuery(component.type);

  return (
    <>
      <ConfigStringProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        schema={schema}
        stringPropertyKeys={imageUploadStringProperties}
        className={className}
      />
      <ConfigNumberProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        schema={schema}
        numberPropertyKeys={imageUploadNumberProperties}
        className={className}
      />
    </>
  );
};
