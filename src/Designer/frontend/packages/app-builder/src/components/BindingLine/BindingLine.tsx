import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ComponentType } from 'app-shared/types/ComponentType';
import { StudioButton } from '@designer/components';
import { DatabaseIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import type { LayoutComponent } from '../../types';
import { getBindingField } from '../../utils/bindingUtils';
import { BindingSearch } from './BindingSearch';
import classes from './BindingLine.module.css';

export type BindingLineProps = {
  component: LayoutComponent;
  onChangeField: (field: string) => void;
};

/**
 * Shows where the component saves its answer, without taking the eye from the form. A file upload
 * shows the data type its attachments are saved as.
 */
export function BindingLine({ component, onChangeField }: BindingLineProps): ReactElement {
  const { t } = useTranslation();
  const { dataModel } = useAppBuilder();
  const [isChanging, setIsChanging] = useState<boolean>(false);
  const isFileUpload = component.type === ComponentType.FileUpload;
  const field = isFileUpload ? component.id : getBindingField(component);

  if (isChanging && dataModel) {
    return (
      <BindingSearch
        componentId={component.id}
        currentField={field}
        onChoose={(newField) => {
          setIsChanging(false);
          onChangeField(newField);
        }}
        onCancel={() => setIsChanging(false)}
      />
    );
  }

  return (
    <div className={classes.bindingLine}>
      <DatabaseIcon aria-hidden className={classes.icon} />
      <span className={classes.label}>
        {t(isFileUpload ? 'app_builder.binding.attachment_type' : 'app_builder.binding.saved_in')}
      </span>
      <span className={classes.field}>{field ?? t('app_builder.binding.none')}</span>
      {!isFileUpload && dataModel && (
        <StudioButton variant='tertiary' data-size='sm' onClick={() => setIsChanging(true)}>
          {t('app_builder.binding.change')}
        </StudioButton>
      )}
    </div>
  );
}
