import React, { useRef, useState } from 'react';
import { Accordion, Modal } from '@digdir/design-system-react';
import { FileIcon } from '@studio/icons';
import { StudioSectionHeader } from '@studio/components';
import { useText, useTextResourcesSelector, useAppContext, useFormLayouts } from '../../../hooks';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { TextResource } from '../../TextResource/TextResource';
import { EditPageId } from './EditPageId';
import { textResourceByLanguageAndIdSelector } from '../../../selectors/textResourceSelectors';
import type { ITextResource } from 'app-shared/types/global';
import {
  duplicatedIdsExistInLayouts,
  duplicatedIdsExistsInLayout,
} from '../../../utils/formLayoutUtils';
import { PageConfigWarning } from './PageConfigWarning';
import classes from './PageConfigPanel.module.css';
import { PageConfigWarningModal } from './PageConfigWarningModal';

export const PageConfigPanel = () => {
  const { selectedFormLayoutName } = useAppContext();
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
    : layoutNameText ?? selectedFormLayoutName;

  const layout = useFormLayouts()[selectedFormLayoutName];
  const hasDuplicatedIds = duplicatedIdsExistsInLayout(layout);

  const formLayouts = useFormLayouts();

  const hasDuplicatedIdsInAllLayouts = duplicatedIdsExistInLayouts(Object.values(formLayouts));

  if (layoutIsSelected && hasDuplicatedIds) {
    return <PageConfigWarning selectedFormLayoutName={selectedFormLayoutName} layout={layout} />;
  }

  // TODO add modal.
  if (hasDuplicatedIdsInAllLayouts) {
    modalRef.current?.showModal();
    return <>{<PageConfigWarningModal modalRef={modalRef} />}</>;
  }

  return (
    <>
      <StudioSectionHeader
        icon={<FileIcon />}
        heading={{
          text: headingTitle,
          level: 2,
        }}
      />
      {layoutIsSelected && (
        <>
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
          </Accordion>
        </>
      )}
    </>
  );
};
