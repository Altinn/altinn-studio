import React, { Fragment } from 'react';
import { Accordion } from '@digdir/designsystemet-react';
import { FileIcon } from '@studio/icons';
import { StudioSectionHeader } from '@studio/components';
import { useText, useTextResourcesSelector, useFormLayouts } from '../../../hooks';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { TextResource } from '../../TextResource/TextResource';
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
import type { ItemType } from '../ItemType';
import type { SelectedItem } from '../../../AppContext';
import { EditPageId } from './EditPageId';

type PageConfigPanelProps = {
  selectedItem: Extract<SelectedItem, { type: ItemType.Page }>;
};

export const PageConfigPanel = ({ selectedItem }: PageConfigPanelProps) => {
  const t = useText();
  const layoutNameTextResourceSelector = textResourceByLanguageAndIdSelector(
    DEFAULT_LANGUAGE,
    selectedItem.id,
  );
  const layoutNameTextResource = useTextResourcesSelector<ITextResource>(
    layoutNameTextResourceSelector,
  );
  const layoutNameText = layoutNameTextResource?.value;
  const headingTitle = layoutNameText || selectedItem.id;

  const layouts: Record<string, IInternalLayout> = useFormLayouts();
  const layout = layouts[selectedItem.id];
  const hasDuplicatedIds = duplicatedIdsExistsInLayout(layout);

  const duplicateLayouts: string[] =
    findLayoutsContainingDuplicateComponents(layouts).duplicateLayouts;
  const hasDuplicatedIdsInAllLayouts = duplicateLayouts?.length > 0;

  if (hasDuplicatedIds) {
    return <PageConfigWarning selectedFormLayoutName={selectedItem.id} layout={layout} />;
  }

  return (
    <>
      <StudioSectionHeader
        data-testid='pageConfigPanel'
        icon={<FileIcon />}
        heading={{
          text: headingTitle,
          level: 2,
        }}
      />
      <Fragment key={selectedItem.id}>
        <EditPageId layoutName={selectedItem.id} />
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>{t('right_menu.text')}</Accordion.Header>
            <Accordion.Content className={classes.text}>
              <TextResource
                handleIdChange={() => {}} // The id is not editable in this context, as it must match the layout name
                label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                textResourceId={selectedItem.id}
                disableSearch={true}
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
      <PageConfigWarningModal open={hasDuplicatedIdsInAllLayouts} />
    </>
  );
};
