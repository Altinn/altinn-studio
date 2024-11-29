import React, { useState } from 'react';

import { Delete as DeleteIcon, Edit as EditIcon } from '@navikt/ds-icons';

import { FieldRenderer } from 'src/app-components/DynamicForm/DynamicForm';
import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { AddToListModal } from 'src/layout/AddToList/AddToList';
import { DropdownCaption } from 'src/layout/Datepicker/DropdownCaption';
import { isFormDataObjectArray, isValidItemsSchema } from 'src/layout/SimpleTable/typeguards';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { FormDataObject, TableActionButton } from 'src/app-components/Table/Table';
import type { PropsFromGenericComponent } from 'src/layout';

type TableComponentProps = PropsFromGenericComponent<'SimpleTable'>;

export function SimpleTableComponent({ node }: TableComponentProps) {
  const item = useNodeItem(node);
  const { formData } = useDataModelBindings(item.dataModelBindings, 1, 'raw');
  const removeFromList = FD.useRemoveFromListCallback();
  const { title, description, help } = item.textResourceBindings ?? {};
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const isMobile = useIsMobile();
  const data = formData.tableData;
  const { schemaLookup } = DataModels.useFullStateRef().current;
  const [showEdit, setShowEdit] = useState(false);
  const [editItemIndex, setEditItemIndex] = useState<number>(-1);
  const setMultiLeafValues = FD.useSetMultiLeafValues();
  const languageLocale = useCurrentLanguage();
  const { langAsString } = useLanguage();

  const schema = schemaLookup[item.dataModelBindings.tableData.dataType].getSchemaForPath(
    item.dataModelBindings.tableData.field,
  )[0];

  const actionButtons: TableActionButton[] = [];

  if (item.enableDelete) {
    actionButtons.push({
      onClick: (idx) => {
        removeFromList({
          startAtIndex: idx,
          reference: {
            dataType: item.dataModelBindings.tableData.dataType,
            field: item.dataModelBindings.tableData.field,
          },
          callback: (_) => true,
        });
      },
      buttonText: <Lang id='general.delete' />,
      icon: <DeleteIcon />,
      color: 'danger',
    });
  }

  if (item.enableEdit) {
    actionButtons.push({
      onClick: (idx, _) => {
        setEditItemIndex(idx);
        setShowEdit(true);
      },
      buttonText: <Lang id='general.edit' />,
      icon: <EditIcon />,
      variant: 'tertiary',
      color: 'second',
    });
  }

  function handleChange(formProps, itemIndex: number) {
    if (!isFormDataObjectArray(formData.tableData)) {
      return;
    }

    const existingData = formData.tableData as FormDataObject[];

    const changes = Object.entries(formProps)
      .filter(([key, value]) => {
        const originalValue = existingData[itemIndex]?.[key];
        return originalValue !== value;
      })
      .map(([key, value]) => ({
        reference: {
          dataType: item.dataModelBindings.tableData.dataType,
          field: `${item.dataModelBindings.tableData.field}[${itemIndex}].${key}`,
        },
        newValue: `${value}`,
      }));

    if (changes.length > 0) {
      setMultiLeafValues({ changes });
    }
  }

  if (!Array.isArray(data)) {
    return null;
  }

  if (data.length < 1) {
    return null;
  }

  if (!isValidItemsSchema(schema?.items)) {
    return null;
  }

  const itemSchema = schema.items;

  return (
    <>
      {showEdit && editItemIndex > -1 && formData.tableData && formData.tableData[editItemIndex] && (
        <AddToListModal
          dataModelReference={item.dataModelBindings.tableData}
          initialData={formData.tableData[editItemIndex]}
          onChange={(formProps) => {
            handleChange(formProps, editItemIndex);
            setEditItemIndex(-1);
            setShowEdit(false);
          }}
          onInteractOutside={() => {
            setShowEdit(false);
          }}
          DropdownCaption={DropdownCaption}
        />
      )}

      <AppTable
        zebra={item.zebra}
        size={item.size}
        schema={schema}
        caption={
          title && (
            <Caption
              title={<Lang id={title} />}
              description={description && <Lang id={description} />}
              helpText={help ? { text: <Lang id={help} />, accessibleTitle } : undefined}
            />
          )
        }
        data={data}
        stickyHeader={true}
        columns={item.columns.map((config) => ({
          ...config,
          header: <Lang id={config.header} />,
          renderCell: config.component
            ? (_, __, rowIndex) => (
                <FieldRenderer
                  locale={languageLocale}
                  rowIndex={rowIndex}
                  fieldKey={config.accessors[0]}
                  fieldSchema={itemSchema.properties[config.accessors[0]]}
                  formData={data[rowIndex]}
                  component={
                    config.component
                      ? {
                          ...config.component,
                          options: config.component?.options?.map((option) => ({
                            ...option,
                            label: langAsString(option.label),
                          })),
                        }
                      : undefined
                  }
                  handleChange={(fieldName, value) => {
                    const valueToUpdate = data.find((_, idx) => idx === rowIndex);
                    const nextValue = { ...valueToUpdate, [`${fieldName}`]: value };
                    handleChange(nextValue, rowIndex);
                  }}
                  schema={schema}
                  DropdownCaption={DropdownCaption}
                  buttonAriaLabel={langAsString('date_picker.aria_label_icon')}
                  calendarIconTitle={langAsString('date_picker.aria_label_icon')}
                />
              )
            : undefined,
        }))}
        mobile={isMobile}
        actionButtons={actionButtons}
        actionButtonHeader={<Lang id='general.action' />}
      />
    </>
  );
}
