import React, { type ReactElement } from 'react';
import type { IInternalLayout } from '../../../../types/global';
import { getChildIds, getItem, isContainer } from '../../../../utils/formLayoutUtils';
import { renderItemList, renderItemListWithAddItemButton } from '../renderItemList';
import { StudioDragAndDropTree } from '@studio/components-legacy';
import { FormItemTitle } from './FormItemTitle';
import { formItemConfigs } from '../../../../data/formItemConfig';
import { useTranslation } from 'react-i18next';
import { UnknownReferencedItem } from '../UnknownReferencedItem';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { useComponentTitle } from '@altinn/ux-editor/hooks';
import { useFeatureFlag, FeatureFlag } from '@studio/feature-flags';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { WithHoverAddButton } from '../../../../components/WithHoverAddButton/WithHoverAddButton';

export type FormItemProps = {
  layout: IInternalLayout;
  id: string;
  saveAtIndexPosition: number;
  duplicateComponents?: string[];
  containerId?: string;
};

export const FormItem = ({
  layout,
  id,
  saveAtIndexPosition,
  duplicateComponents,
  containerId,
}: FormItemProps): ReactElement => {
  const { t } = useTranslation();
  const shouldRenderWithHoverAddButton = useFeatureFlag(FeatureFlag.AddComponentModal);
  const formItem = getItem(layout, id);
  if (!formItem) {
    return <UnknownReferencedItem id={id} layout={layout} />;
  }

  if (shouldRenderWithHoverAddButton) {
    return (
      <WithHoverAddButton
        layout={layout}
        saveAtIndexPosition={saveAtIndexPosition}
        containerId={containerId || BASE_CONTAINER_ID}
        title={t('ux_editor.add_item.new_component')}
      >
        <Item duplicateComponents={duplicateComponents} layout={layout} id={id} />
      </WithHoverAddButton>
    );
  }

  return <Item duplicateComponents={duplicateComponents} layout={layout} id={id} />;
};

type ItemProps = {
  layout: IInternalLayout;
  id: string;
  duplicateComponents?: string[];
};
const Item = ({ id, layout, duplicateComponents }: ItemProps): ReactElement => {
  const { t } = useTranslation();
  const componentTitle = useComponentTitle();
  const isAddComponentModalEnabled = useFeatureFlag(FeatureFlag.AddComponentModal);

  const formItem = getItem(layout, id);

  const isUnknownInternalComponent: boolean = !formItemConfigs[formItem.type];

  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[formItem.type]?.icon;

  const labelWrapper = (label: string) => (
    <FormItemTitle duplicateComponents={duplicateComponents} formItem={formItem}>
      {label}
    </FormItemTitle>
  );

  const shouldDisplayAddButton =
    isContainer(layout, id) && !getChildIds(layout, id).length && isAddComponentModalEnabled;
  return (
    <StudioDragAndDropTree.Item
      icon={Icon && <Icon />}
      emptyMessage={t('ux_editor.container_empty')}
      expandable={isContainer(layout, id)}
      label={componentTitle(formItem)}
      labelWrapper={labelWrapper}
      nodeId={id}
    >
      {shouldDisplayAddButton
        ? renderItemListWithAddItemButton(layout, duplicateComponents, id)
        : renderItemList(layout, duplicateComponents, id, false)}
    </StudioDragAndDropTree.Item>
  );
};
