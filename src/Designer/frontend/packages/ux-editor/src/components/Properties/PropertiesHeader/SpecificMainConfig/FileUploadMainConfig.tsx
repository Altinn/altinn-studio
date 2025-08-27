import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { properties } from '../../../../testing/schemas/json/component/FileUpload.schema.v1.json';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { useComponentSchemaQuery } from '../../../../hooks/queries/useComponentSchemaQuery';
import { ConfigNumberProperties } from '../../../config/ConfigProperties/ConfigNumberProperties';

type FileUploadMainProperties = (keyof typeof properties)[];
const fileUploadMainStringProperties: FileUploadMainProperties = ['displayMode'];
const fileUploadMainNumberProperties: FileUploadMainProperties = [
  'maxFileSizeInMB',
  'maxNumberOfAttachments',
  'minNumberOfAttachments',
];

type FileUploadMainConfigProps = {
  component: FormItem<ComponentType.FileUpload | ComponentType.FileUploadWithTag>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const FileUploadMainConfig = ({
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
        stringPropertyKeys={fileUploadMainStringProperties}
        className={className}
      />

      <ConfigNumberProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        schema={schema}
        numberPropertyKeys={fileUploadMainNumberProperties}
        className={className}
      />
    </>
  );
};
