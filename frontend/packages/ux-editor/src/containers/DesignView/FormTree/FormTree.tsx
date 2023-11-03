import React from 'react';
import { IInternalLayout } from '../../../types/global';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { FormItemList } from './FormItemList';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormContext } from '../../FormContext';
import { getItem } from '../../../utils/formLayoutUtils';

export type FormTreeProps = {
  layout: IInternalLayout;
};

export const FormTree = ({ layout }: FormTreeProps) => {
  const { handleEdit } = useFormContext();

  const handleSelect = async (id: string) => handleEdit(getItem(layout, id));

  return (
    <DragAndDropTree.Root onSelect={handleSelect}>
      <FormItemList layout={layout} parentId={BASE_CONTAINER_ID} />
    </DragAndDropTree.Root>
  );
};
