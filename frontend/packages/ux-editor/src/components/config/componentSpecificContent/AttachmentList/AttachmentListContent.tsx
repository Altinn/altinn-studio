import React from 'react';
import { Combobox, Switch } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './AttachmentListContent.module.css';

type IAttachmentListContent = {
  component: any;
  handleComponentChange: any;
  dataTypes: string[];
  setOnlyCurrentTask: (value: boolean) => void;
  onlyCurrentTask: boolean;
};

export const AttachmentListContent = ({
  component,
  handleComponentChange,
  dataTypes,
  setOnlyCurrentTask,
  onlyCurrentTask,
}: IAttachmentListContent) => {
  const { t } = useTranslation();

  const handleValueChanges = (updateDataTypes: string[]) => {
    const last = updateDataTypes[updateDataTypes.length - 1];
    switch (last) {
      case 'include-all':
        updateDataTypes = ['include-all'];
        break;
      case 'include-attachments':
        updateDataTypes = [];
        break;
      default:
        updateDataTypes = updateDataTypes.filter(
          (dataType) => dataType !== 'include-all' && dataType !== 'include-attachments',
        );
        break;
    }
    handleComponentChange({ ...component, dataTypeIds: updateDataTypes });
  };

  const getSelectedDataTypes = () => {
    let value: string[];
    if (onlyCurrentTask) {
      const currentDataTypes = component.dataTypeIds.filter((dataType: string) =>
        dataTypes.includes(dataType),
      );
      value = currentDataTypes;
    } else {
      value = component.dataTypeIds ?? [];
    }

    return value.length === 0 ? ['include-attachments'] : value;
  };

  return (
    <>
      <Switch onChange={() => setOnlyCurrentTask(!onlyCurrentTask)} size='small'>
        {t('ux_editor.component_properties.current_task')}
      </Switch>

      <Combobox
        multiple
        label={t('ux_editor.component_properties.select_attachments')}
        className={classes.comboboxLabel}
        size='small'
        value={getSelectedDataTypes()}
        onValueChange={handleValueChanges}
      >
        {dataTypes.map((dataType) => {
          return (
            <Combobox.Option
              key={dataType}
              value={dataType}
              description={getDescription(dataType)}
              displayValue={getDescription(dataType)}
            />
          );
        })}
      </Combobox>
    </>
  );
};

const getDescription = (dataType: string) => {
  switch (dataType) {
    case 'ref-data-as-pdf':
      return 'Generert PDF';
    case 'include-all':
      return 'Alle vedlegg (inkl. PDF)';
    case 'include-attachments':
      return 'Alle vedlegg (eksl. PDF)';
    default:
      return dataType;
  }
};
