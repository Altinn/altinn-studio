import type { IInternalLayout } from '../../types/global';
import { FormTree } from './FormTree';
import { getChildIds, getItem, hasMultiPageGroup } from '../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { FormLayoutWarning } from './FormLayoutWarning';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { AddItem } from './AddItem';
import { useFeatureFlag, FeatureFlag } from '@studio/feature-flags';
import { StudioParagraph, StudioAlert } from '@studio/components';
import { ComponentType } from 'app-shared/types/ComponentType';

export interface FormLayoutProps {
  layout: IInternalLayout;
  isInvalid: boolean;
  duplicateComponents?: string[];
}

export const FormLayout = ({ layout, isInvalid, duplicateComponents }: FormLayoutProps) => {
  const isAddComponentModalEnabled = useFeatureFlag(FeatureFlag.AddComponentModal);

  if (isInvalid) {
    return <FormLayoutWarning layout={layout} />;
  }

  return (
    <>
      {hasMultiPageGroup(layout) && <MultiPageWarning />}
      {/** The following check and component are added as part of a live user test behind a feature flag. Can be removed if we decide not to use after user test.*/}
      {isAddComponentModalEnabled && hasOnlyNavigationButtons(layout) && (
        <AddItem containerId={BASE_CONTAINER_ID} layout={layout} saveAtIndexPosition={0} />
      )}
      <FormTree duplicateComponents={duplicateComponents} layout={layout} />
    </>
  );
};

const hasOnlyNavigationButtons = (layout: IInternalLayout): boolean =>
  getChildIds(layout, BASE_CONTAINER_ID).every(
    (id) => getItem(layout, id)?.type === ComponentType.NavigationButtons,
  );

const MultiPageWarning = () => {
  const { t } = useTranslation();
  return (
    <StudioAlert data-color='warning'>
      <StudioParagraph data-size='sm'>{t('ux_editor.multi_page_warning')}</StudioParagraph>
    </StudioAlert>
  );
};
