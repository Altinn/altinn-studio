import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { OrganisationLogo } from 'src/components/presentation/OrganisationLogo/OrganisationLogo';
import { DummyPresentation } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { DataLoadingState, useDataLoadingStore } from 'src/core/contexts/dataLoadingContext';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useStrictDataElements } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsPayment } from 'src/features/payment/utils';
import classes from 'src/features/pdf/PDFView.module.css';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
import { getFeature } from 'src/features/toggles';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { getComponentDef } from 'src/layout';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { InstanceInformation } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { SubformSummaryComponent2 } from 'src/layout/Subform/Summary/SubformSummaryComponent2';
import { SummaryComponent } from 'src/layout/Summary/SummaryComponent';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { Hidden, isHidden, NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeData } from 'src/utils/layout/types';

export const PDFView2 = () => {
  const order = usePageOrder();
  const { data: pdfSettings, isFetching: pdfFormatIsLoading } = usePdfFormatQuery(true);
  const pdfLayoutName = useLayoutSettings().pages.pdfLayoutName;
  const isHiddenPage = Hidden.useIsHiddenPageSelector();

  if (pdfFormatIsLoading) {
    return null;
  }

  if (pdfLayoutName) {
    // Render all components directly if given a separate PDF layout
    return (
      <DataLoaderStoreInit>
        <PdfWrapping>
          <PlainPage pageKey={pdfLayoutName} />
        </PdfWrapping>
      </DataLoaderStoreInit>
    );
  }

  return (
    <DummyPresentation>
      <DataLoaderStoreInit>
        <PdfWrapping>
          <div className={classes.instanceInfo}>
            <InstanceInformation
              elements={{
                dateSent: true,
                sender: true,
                receiver: true,
                referenceNumber: true,
              }}
            />
          </div>
          {order
            ?.filter((pageKey) => !isHiddenPage(pageKey))
            .filter((pageKey) => !pdfSettings?.excludedPages.includes(pageKey))
            .map((pageKey) => (
              <PdfForPage
                key={pageKey}
                pageKey={pageKey}
                pdfSettings={pdfSettings}
              />
            ))}
          <SubformSummaryComponent2 />
        </PdfWrapping>
      </DataLoaderStoreInit>
    </DummyPresentation>
  );
};

export function DataLoaderStoreInit({ children }: PropsWithChildren) {
  const subformIds = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter((node) => node.layout.type === 'Subform')
      .map((node) => node.layout.id),
  );

  const [loadingState, setLoadingState] = React.useState(() => {
    const initialLoadingState: Record<string, DataLoadingState> = {};
    for (const subformId of subformIds) {
      initialLoadingState[subformId] = DataLoadingState.Loading;
    }

    return initialLoadingState;
  });

  const handleWorkerCompletion = React.useCallback((subformId: string) => {
    setLoadingState((prevState) => ({
      ...prevState,
      [subformId]: DataLoadingState.Ready,
    }));
  }, []);

  const hasFinishedLoading = Object.values(loadingState).every((v) => v === DataLoadingState.Ready);

  return (
    <>
      {subformIds.map((subformId, idx) => (
        <DataLoaderStoreInitWorker
          key={idx}
          nodeId={subformId}
          initComplete={handleWorkerCompletion}
        />
      ))}
      {hasFinishedLoading && children}
    </>
  );
}

function DataLoaderStoreInitWorker({
  nodeId,
  initComplete,
}: PropsWithChildren<{
  nodeId: string;
  initComplete: (subformId: string) => void;
}>): React.JSX.Element | null {
  const node = useNode(nodeId) as LayoutNode<'Subform'>;
  const { layoutSet } = useNodeItem(node);
  const setDataLoaderElements = useDataLoadingStore((state) => state.setDataElements);
  const dataLoaderElements = useDataLoadingStore((state) => state.dataElements);

  const dataType = useDataTypeFromLayoutSet(layoutSet);
  const dataElements = useStrictDataElements(dataType);

  useEffect(() => {
    const elements: Record<string, DataLoadingState> = {};
    for (const element of dataElements) {
      if (element.id in dataLoaderElements) {
        continue;
      }
      elements[element.id] = DataLoadingState.Loading;
    }

    if (Object.keys(elements).length) {
      setDataLoaderElements(elements);
    }
    initComplete(node.id);
  }, [dataElements, dataLoaderElements, setDataLoaderElements, initComplete, node.id]);

  return null;
}

function PdfWrapping({ children }: PropsWithChildren) {
  const enableOrgLogo = Boolean(useApplicationMetadata().logoOptions);
  const appOwner = useAppOwner();
  const appName = useAppName();
  const { langAsString } = useLanguage();
  const isPayment = useIsPayment();

  return (
    <div
      id='pdfView'
      className={classes.pdfWrapper}
    >
      {appOwner && <span role='doc-subtitle'>{appOwner}</span>}

      <ConditionalWrapper
        condition={enableOrgLogo}
        wrapper={(children) => (
          <div
            className={classes.paymentTitleContainer}
            data-testid='pdf-logo'
          >
            {children} <OrganisationLogo />
          </div>
        )}
      >
        <Heading
          level={1}
          size='lg'
        >
          {isPayment ? `${appName} - ${langAsString('payment.receipt.title')}` : appName}
        </Heading>
      </ConditionalWrapper>
      {children}
      <ReadyForPrint type='print' />
    </div>
  );
}

function PlainPage({ pageKey }: { pageKey: string }) {
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter((data) => data.pageKey === pageKey && data.parentId === undefined) // Find top-level nodes
      .map((data) => data.layout.id),
  );

  return (
    <div className={classes.page}>
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((nodeId) => (
          <GenericComponentById
            key={nodeId}
            id={nodeId}
          />
        ))}
      </Flex>
    </div>
  );
}

function PdfForPage({ pageKey, pdfSettings }: { pageKey: string; pdfSettings: IPdfFormat | undefined }) {
  const children = NodesInternal.useShallowSelector((state) =>
    Object.values(state.nodeData)
      .filter(
        (data) =>
          data.pageKey === pageKey &&
          data.parentId === undefined &&
          data.layout.type !== 'Subform' &&
          !isHidden(state, 'node', data.layout.id) &&
          !pdfSettings?.excludedComponents.includes(data.layout.id),
      )
      .filter(<T extends CompTypes>(data: NodeData<T>) => {
        const def = getComponentDef(data.layout.type);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return def.shouldRenderInAutomaticPDF(data as any);
      })
      .map((data) => data.layout.id),
  );

  return (
    <div className={classes.page}>
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {children.map((nodeId) => (
          <PdfForNode
            key={nodeId}
            nodeId={nodeId}
          />
        ))}
      </Flex>
    </div>
  );
}

function PdfForNode({ nodeId }: { nodeId: string }) {
  const node = useNode(nodeId);
  const target = useNodeItem(node, (i) => (i.type === 'Summary2' ? i.target : undefined));

  if (!node) {
    return null;
  }

  if (node.isType('Summary2') && target?.taskId) {
    return (
      <SummaryComponent2
        key={node.id}
        summaryNode={node}
      />
    );
  }

  const betaEnabled = getFeature('betaPDFenabled');
  if (betaEnabled.value) {
    return <ComponentSummary componentNode={node} />;
  }

  return (
    <SummaryComponent
      summaryNode={undefined}
      overrides={{
        targetNode: node,
        largeGroup: node.isType('Group'),
        display: {
          hideChangeButton: true,
          hideValidationMessages: true,
        },
      }}
    />
  );
}
