import React from 'react';

import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks';
import AutomaticPDFLayout from 'src/features/pdf/AutomaticPDFLayout';
import CustomPDFLayout from 'src/features/pdf/CustomPDFLayout';
import css from 'src/features/pdf/PDFView.module.css';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { getInstanceContextSelector } from 'src/utils/instanceContext';
import type { IInstanceContext } from 'src/types/shared';

interface PDFViewProps {
  appName: string;
  appOwner?: string;
}

const PDFView = ({ appName, appOwner }: PDFViewProps) => {
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const excludePageFromPdf = useAppSelector((state) => new Set(state.formLayout.uiConfig.excludePageFromPdf));
  const excludeComponentFromPdf = useAppSelector((state) => new Set(state.formLayout.uiConfig.excludeComponentFromPdf));
  const pageOrder = useAppSelector((state) => state.formLayout.uiConfig.tracks.order);
  const hiddenPages = useAppSelector((state) => new Set(state.formLayout.uiConfig.tracks.hidden));
  const pdfLayoutName = useAppSelector((state) => state.formLayout.uiConfig.pdfLayoutName);
  const optionsLoading = useAppSelector((state) => state.optionState.loading);
  const dataListLoading = useAppSelector((state) => state.dataListState.loading);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const instanceContextSelector = getInstanceContextSelector();
  const instanceContext: IInstanceContext = useAppSelector(instanceContextSelector);
  const applicationSettings = useAppSelector((state) => state.applicationSettings.applicationSettings);
  const formData = useAppSelector((state) => state.formData?.formData);
  const hiddenFields = useAppSelector((state) => state.formLayout.uiConfig.hiddenFields);
  const parties = useAppSelector((state) => state.party.parties);
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const instance = useAppSelector((state) => state.instanceData.instance);
  const allOrgs = useAppSelector((state) => state.organisationMetaData.allOrgs);
  const profile = useAppSelector((state) => state.profile.profile);

  if (
    optionsLoading ||
    dataListLoading ||
    !layouts ||
    !excludePageFromPdf ||
    !excludeComponentFromPdf ||
    !pageOrder ||
    !hiddenPages ||
    !repeatingGroups ||
    !instanceContext ||
    !applicationSettings ||
    !formData ||
    !hiddenFields ||
    !parties ||
    !language ||
    !textResources ||
    !instance ||
    !allOrgs ||
    !profile
  ) {
    return null;
  }

  const pdfLayout = pdfLayoutName ? layouts[pdfLayoutName] : undefined;
  return (
    <div className={css['pdf-wrapper']}>
      <h1 className={cn({ [css['title-margin']]: !appOwner })}>{appName}</h1>
      {appOwner && (
        <p
          role='doc-subtitle'
          className={css['title-margin']}
        >
          {appOwner}
        </p>
      )}
      {typeof pdfLayout !== 'undefined' ? (
        <CustomPDFLayout layout={pdfLayout} />
      ) : (
        <AutomaticPDFLayout
          excludeComponentFromPdf={excludeComponentFromPdf}
          excludePageFromPdf={excludePageFromPdf}
          hiddenPages={hiddenPages}
          layouts={layouts}
          pageOrder={pageOrder}
        />
      )}
      <ReadyForPrint />
    </div>
  );
};

export default PDFView;
