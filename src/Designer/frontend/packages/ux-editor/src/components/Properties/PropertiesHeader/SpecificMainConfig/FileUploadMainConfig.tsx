import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { ConfigStringProperties } from '../../../config/ConfigProperties/ConfigStringProperties';
import { getComponentDefinition } from '../../../../data/componentCatalog';
import { ConfigNumberProperties } from '../../../config/ConfigProperties/ConfigNumberProperties';

const fileUploadMainStringProperties = ['displayMode'];
const fileUploadMainNumberProperties = [
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
  const properties = getComponentDefinition(component.type)?.properties ?? {};

  return (
    <>
      <ConfigStringProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        properties={properties}
        stringPropertyKeys={fileUploadMainStringProperties}
        className={className}
      />

      <ConfigNumberProperties
        component={component}
        handleComponentUpdate={handleComponentChange}
        properties={properties}
        numberPropertyKeys={fileUploadMainNumberProperties}
        className={className}
      />
    </>
  );
};
