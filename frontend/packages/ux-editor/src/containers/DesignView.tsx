import React from 'react';
import { Container } from './Container';

import type { HandleDrop, ItemPosition } from '../types/dndTypes';
import { useParams } from 'react-router-dom';
import { addItemOfType, moveLayoutItem } from '../utils/formLayoutUtils';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../selectors/formLayoutSelectors';
import { useFormLayoutMutation } from '../hooks/mutations/useFormLayoutMutation';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { ExistingDndItem, NewDndItem } from '../types/dndTypes';
import { generateComponentId } from '../utils/generateId';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';

export const DesignView = () => {
  const { org, app } = useParams();
  const { data: layouts } = useFormLayoutsQuery(org, app);
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const { mutate: updateFormLayout } = useFormLayoutMutation(org, app, layoutName);

  const addItem = (item: NewDndItem, { parentId, index }: ItemPosition) => {
    const newId = generateComponentId(item.type, layouts);
    updateFormLayout(addItemOfType(layout, item.type, newId, parentId, index));
  };

  const moveItem = (item: ExistingDndItem, { parentId, index }: ItemPosition) =>
    updateFormLayout(moveLayoutItem(layout, item.id, parentId, index));

  const handleDrop: HandleDrop = (item, position) =>
    item.isNew === true ? addItem(item, position) : moveItem(item, position);

  return (
    <Container
      isBaseContainer={true}
      id={BASE_CONTAINER_ID}
      handleDrop={handleDrop}
    />
  );
};
