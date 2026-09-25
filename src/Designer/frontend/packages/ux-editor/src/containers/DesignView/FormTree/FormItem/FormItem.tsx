import type { ReactElement } from 'react';
import type { IInternalLayout } from '../../../../types/global';
import { getChildIds, getItem, isContainer } from '../../../../utils/formLayoutUtils';
import { renderItemList, renderItemListWithAddItemButton } from '../renderItemList';
import {
  StudioButton,
  StudioDragAndDrop,
  StudioDragAndDropTree,
  StudioTextfield,
} from '@studio/components';
import { FormItemTitle } from './FormItemTitle';
import { formItemConfigs } from '../../../../data/formItemConfig';
import { useTranslation } from 'react-i18next';
import { UnknownReferencedItem } from '../UnknownReferencedItem';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { useComponentTitle } from '@altinn/ux-editor/hooks';
import { useFeatureFlag, FeatureFlag } from '@studio/feature-flags';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { WithHoverAddButton } from '../../../../components/WithHoverAddButton/WithHoverAddButton';
import { StudioDragAndDropList } from '@studio/components/src/components/StudioDragAndDrop/StudioDragAndDropList';

export type FormItemProps = {
  layout: IInternalLayout;
  id: string;
  saveAtIndexPosition: number;
  duplicateComponents?: string[];
  containerId?: string;
  isLastChild?: boolean;
};

export const FormItem = ({
  layout,
  id,
  saveAtIndexPosition,
  duplicateComponents,
  containerId,
  isLastChild,
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
        isLastChild={isLastChild}
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
    <StudioDragAndDrop.ListItem
      itemId={id}
      renderItem={(dragHandleRef) => (
        <div style={{ margin: '0px 24px' }}>
          {formItem.type === 'Input' && (
            <StudioTextfield label={componentTitle(formItem)} id={`textfield-${id}`} />
          )}
          {formItem.type === 'NavigationButtons' && (
            <StudioButton id={`navigationbutton-${id}`}>{componentTitle(formItem)}</StudioButton>
          )}
        </div>
      )}
    />
  );
};
