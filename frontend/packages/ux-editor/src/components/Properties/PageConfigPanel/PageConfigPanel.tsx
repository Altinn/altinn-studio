import React, { Fragment, useEffect, useRef } from 'react';
import { Accordion } from '@digdir/designsystemet-react';
import { FileIcon } from '@studio/icons';
import { StudioAlert, StudioSectionHeader } from '@studio/components-legacy';
import { useText, useTextResourcesSelector, useAppContext, useFormLayouts } from '../../../hooks';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { TextResource } from '../../TextResource/TextResource';
import { EditPageId } from './EditPageId';
import { textResourceByLanguageAndIdSelector } from '../../../selectors/textResourceSelectors';
import type { ITextResource } from 'app-shared/types/global';
import {
  duplicatedIdsExistsInLayout,
  findLayoutsContainingDuplicateComponents,
} from '../../../utils/formLayoutUtils';
import { PageConfigWarning } from './PageConfigWarning';
import classes from './PageConfigPanel.module.css';
import { PageConfigWarningModal } from './PageConfigWarningModal';
import type { IInternalLayout } from '@altinn/ux-editor/types/global';
import { PdfConfig } from '@altinn/ux-editor/components/Properties/PageConfigPanel/PdfConfig';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { usePagesQuery } from '@altinn/ux-editor/hooks/queries/usePagesQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const PageConfigPanel = () => {
  const { selectedFormLayoutName, selectedFormLayoutSetName, selectedGroupName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const hasGroups = pagesModel?.groups?.length > 0;

  const t = useText();
  const modalRef = useRef<HTMLDialogElement>(null);
  const layoutIsSelected =
    selectedFormLayoutName !== DEFAULT_SELECTED_LAYOUT_NAME && selectedFormLayoutName !== undefined;
  const layoutNameTextResourceSelector = textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    selectedFormLayoutName,
  );
  const layoutNameTextResource = useTextResourcesSelector<ITextResource>(
    layoutNameTextResourceSelector,
  );
  const layoutNameText = layoutNameTextResource?.value;
  const headingTitle = !layoutIsSelected
    ? t('right_menu.content_empty')
    : (layoutNameText ?? selectedFormLayoutName);

  const layouts: Record<string, IInternalLayout> = useFormLayouts();
  const layout = layouts[selectedFormLayoutName];
  const hasDuplicatedIds = duplicatedIdsExistsInLayout(layout);

  const duplicateLayouts: string[] =
    findLayoutsContainingDuplicateComponents(layouts).duplicateLayouts;
  const hasDuplicatedIdsInAllLayouts = duplicateLayouts?.length > 0;

  useEffect(() => {
    if (hasDuplicatedIdsInAllLayouts) {
      modalRef.current?.showModal();
    }
  }, [hasDuplicatedIdsInAllLayouts]);

  if (layoutIsSelected && hasDuplicatedIds) {
    return <PageConfigWarning selectedFormLayoutName={selectedFormLayoutName} layout={layout} />;
  }

  const isTaskNavigationPageGroups = shouldDisplayFeature(FeatureFlag.TaskNavigationPageGroups);
  const headerText =
    isTaskNavigationPageGroups && hasGroups
      ? (selectedGroupName ?? t('right_menu.content_group_empty'))
      : headingTitle;

  return (
    <>
      <StudioSectionHeader
        icon={<FileIcon />}
        heading={{
          text: headerText,
          level: 2,
        }}
      />
      {hasGroups && (
        <StudioAlert severity='info' className={classes.configPanel}>
          {t('right_menu.content_group_message')}
        </StudioAlert>
      )}
      {layoutIsSelected && (
        <Fragment key={selectedFormLayoutName}>
          <EditPageId layoutName={selectedFormLayoutName} />
          <Accordion color='subtle'>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.text')}</Accordion.Header>
              <Accordion.Content className={classes.text}>
                <TextResource
                  handleIdChange={() => {}}
                  label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                  textResourceId={selectedFormLayoutName}
                />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.dynamics')}</Accordion.Header>
              <Accordion.Content>
                <HiddenExpressionOnLayout />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>{t('right_menu.pdf')}</Accordion.Header>
              <Accordion.Content className={classes.pdf}>
                <PdfConfig />
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </Fragment>
      )}
      <PageConfigWarningModal modalRef={modalRef} />
    </>
  );
};
