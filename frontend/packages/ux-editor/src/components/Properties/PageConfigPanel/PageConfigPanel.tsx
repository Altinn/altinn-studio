import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Accordion } from '@digdir/design-system-react';
import { FileIcon } from '@navikt/aksel-icons';
import { StudioSectionHeader } from '@studio/components';
import { useText } from '../../../hooks';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { HiddenExpressionOnLayout } from './HiddenExpressionOnLayout';
import { selectedLayoutNameSelector } from '../../../selectors/formLayoutSelectors';
import { getCurrentEditId } from '../../../selectors/textResourceSelectors';
import { TextResourceEdit } from '../../TextResourceEdit';
import { TextResource } from '../../TextResource';
import { EditPageId } from './EditPageId';

export const PageConfigPanel = () => {
  const { app, org } = useStudioUrlParams();
  const layoutName = useSelector(selectedLayoutNameSelector);
  const editId = useSelector(getCurrentEditId);
  const { data: textResources } = useTextResourcesQuery(org, app);
  const [openList, setOpenList] = useState<string[]>([]);
  const t = useText();

  const layoutIsSelected = layoutName !== DEFAULT_SELECTED_LAYOUT_NAME && layoutName !== undefined;

  const layoutNameFromTextResource = Object.values(textResources[DEFAULT_LANGUAGE] ?? []).find(
    (textResource) => textResource.id === layoutName,
  )?.value;

  const headingTitle = !layoutIsSelected
    ? t('right_menu.content_empty')
    : layoutNameFromTextResource ?? layoutName;

  const toggleOpen = (id: string) => {
    if (openList.includes(id)) {
      setOpenList(openList.filter((item) => item !== id));
    } else {
      setOpenList([...openList, id]);
    }
  };

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
          <EditPageId layoutName={layoutName} />
          <Accordion color='subtle'>
            <Accordion.Item open={openList.includes('text')}>
              <Accordion.Header onHeaderClick={() => toggleOpen('text')}>
                {t('right_menu.text')}
              </Accordion.Header>
              <Accordion.Content>
                {editId ? (
                  <TextResourceEdit />
                ) : (
                  <TextResource
                    handleIdChange={() => {}}
                    label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                    placeholder={t('ux_editor.modal_properties_textResourceBindings_page_name_add')}
                    textResourceId={layoutName}
                  />
                )}
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item open={openList.includes('dynamics')}>
              <Accordion.Header onHeaderClick={() => toggleOpen('dynamics')}>
                {t('right_menu.dynamics')}
              </Accordion.Header>
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
