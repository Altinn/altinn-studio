import React, { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { Panel } from 'src/app-components/Panel/Panel';
import classes from 'src/components/message/ErrorReport.module.css';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { isAxiosError } from 'src/utils/isAxiosError';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
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
  if (errors === undefined || hasErrorReport || !show) {
    return children;
  }

  return (
    <ErrorReportContext.Provider value={true}>
      <div data-testid='ErrorReport'>
        <Panel
          title={<Lang id='form_filler.error_report_header' />}
          variant={PANEL_VARIANT.Error}
          isOnBottom
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
              <ul className={classes.errorList}>{errors}</ul>
            </Flex>
            {children}
          </Flex>
        </Panel>
      </div>
    </ErrorReportContext.Provider>
  );
};

function ErrorReportListItem({ children }: PropsWithChildren) {
  return <li style={{ listStyleImage: listStyleImg }}>{children}</li>;
}

interface ErrorReportListProps {
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
}

export function ErrorReportList({ formErrors, taskErrors }: ErrorReportListProps) {
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();

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
          <Link to='/party-selection/'>
            <Lang id='party_selection.change_party' />
          </Link>
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
  const node = useNode(error.nodeId);
  const navigateTo = useNavigateToNode();
  const isHidden = Hidden.useIsHidden(node);

  const handleErrorClick = async (ev: React.KeyboardEvent | React.MouseEvent) => {
    if (ev.type === 'keydown' && (ev as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    if (isHidden || !node) {
      // No point in trying to focus on a hidden component
      return;
    }

    await navigateTo(node, { shouldFocus: true, error });
  };

  return (
    <ErrorReportListItem>
      <button
        className={classes.buttonAsInvisibleLink}
        onClick={handleErrorClick}
        onKeyDown={handleErrorClick}
      >
        <Lang
          id={error.message.key}
          params={error.message.params}
          node={node}
        />
      </button>
    </ErrorReportListItem>
  );
}
