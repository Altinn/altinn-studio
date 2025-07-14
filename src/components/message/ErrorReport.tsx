import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { ErrorSummary } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import classes from 'src/components/message/ErrorReport.module.css';
import { useAllAttachments } from 'src/features/attachments/hooks';
import { FileScanResults } from 'src/features/attachments/types';
import { useNavigateTo } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { isAxiosError } from 'src/utils/isAxiosError';
import { DataModelLocationProviderFromNode } from 'src/utils/layout/DataModelLocation';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { UploadedAttachment } from 'src/features/attachments';
import type { AnyValidation, BaseValidation, NodeRefValidation } from 'src/features/validation';

export interface IErrorReportProps extends PropsWithChildren {
  show: boolean;
  errors: React.ReactNode | undefined;
}

const ArrowForwardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" style="position: relative; top: 2px">
<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
</svg>`;
const listStyleImg = `url("data:image/svg+xml,${encodeURIComponent(ArrowForwardSvg)}")`;

// It is possible to render multiple error reports inside each other. If that happens, we should detect it and only
// render the outermost one. This may be a case in stateless apps, where you can have both validation errors and
// instantiation errors at the same time.
const ErrorReportContext = createContext(false);

export const ErrorReport = ({ children, errors, show }: IErrorReportProps) => {
  const hasErrorReport = useContext(ErrorReportContext);
  const isMobile = useIsMobile();
  if (errors === undefined || hasErrorReport || !show) {
    return children;
  }

  return (
    <ErrorReportContext.Provider value={true}>
      <FullWidthWrapper isOnBottom={true}>
        <ErrorSummary
          data-testid='ErrorReport'
          className={classes.errorSummary}
          data-size={isMobile ? 'md' : 'lg'}
        >
          <Flex
            container
            item
            spacing={6}
            alignItems='flex-start'
          >
            <Flex
              item
              size={{ xs: 12 }}
            >
              <ErrorSummary.Heading>
                <Lang id='form_filler.error_report_header' />
              </ErrorSummary.Heading>
              <ErrorSummary.List className={classes.errorList}>{errors}</ErrorSummary.List>
            </Flex>
            {children}
          </Flex>
        </ErrorSummary>
      </FullWidthWrapper>
    </ErrorReportContext.Provider>
  );
};

function ErrorReportListItem({ children }: PropsWithChildren) {
  return <ErrorSummary.Item style={{ listStyleImage: listStyleImg }}>{children}</ErrorSummary.Item>;
}

interface ErrorReportListProps {
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
}

export function ErrorReportList({ formErrors, taskErrors }: ErrorReportListProps) {
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();
  const allAttachments = useAllAttachments();

  const infectedFileErrors: NodeRefValidation[] = Object.entries(allAttachments || {}).flatMap(
    ([nodeId, attachments]) => {
      const { baseComponentId } = splitDashedKey(nodeId);

      return (attachments || [])
        .filter((attachment) => attachment.uploaded && attachment.data.fileScanResult === FileScanResults.Infected)
        .map((attachment) => {
          const uploadedAttachment = attachment as UploadedAttachment;
          return {
            nodeId,
            baseComponentId,
            source: 'Frontend',
            code: 'InfectedFile',
            dataElementId: uploadedAttachment.data.id,
            message: {
              key: 'general.wait_for_attachments_infected',
              params: [uploadedAttachment.data.filename],
            },
            severity: 'error',
            category: 0,
          };
        });
    },
  );

  return (
    <>
      {taskErrors.map((error) => (
        <ErrorReportListItem key={getUniqueKeyFromObject(error)}>
          <Lang
            id={error.message.key}
            params={error.message.params}
          />
        </ErrorReportListItem>
      ))}
      {infectedFileErrors.map((error) => (
        <ErrorWithLink
          key={`infected-${error.nodeId}`}
          error={error}
        />
      ))}
      {formErrors.map((error) => (
        <ErrorWithLink
          key={getUniqueKeyFromObject(error)}
          error={error}
        />
      ))}
    </>
  );
}

/**
 * @see InstantiateContainer Contains somewhat similar logic, but for a full-screen error page.
 */
export function ErrorListFromInstantiation({ error }: { error: unknown }) {
  const selectedParty = useSelectedParty();

  if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (error.response?.data as any)?.message;
    if (message) {
      return (
        <ErrorReportListItem>
          <Lang id={message} />
        </ErrorReportListItem>
      );
    }
    return (
      <ErrorReportListItem>
        <span>
          <Lang
            id='instantiate.authorization_error_rights'
            params={[selectedParty?.name]}
          />{' '}
          (
          <ErrorSummary.Link href='/party-selection/'>
            <Lang id='party_selection.change_party' />
          </ErrorSummary.Link>
          ).
        </span>
      </ErrorReportListItem>
    );
  }

  return (
    <ErrorReportListItem>
      <Lang id='instantiate.unknown_error_text' />
    </ErrorReportListItem>
  );
}

function ErrorWithLink({ error }: { error: NodeRefValidation }) {
  const navigateTo = useNavigateTo();
  const handleErrorClick = async (ev: React.KeyboardEvent | React.MouseEvent) => {
    if (ev.type === 'keydown' && (ev as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    await navigateTo(error.nodeId, error.baseComponentId, { shouldFocus: true, error });
  };

  return (
    <ErrorReportListItem>
      <button
        className={classes.buttonAsInvisibleLink}
        onClick={handleErrorClick}
        onKeyDown={handleErrorClick}
      >
        <DataModelLocationProviderFromNode nodeId={error.nodeId}>
          <Lang
            id={error.message.key}
            params={error.message.params}
          />
        </DataModelLocationProviderFromNode>
      </button>
    </ErrorReportListItem>
  );
}
