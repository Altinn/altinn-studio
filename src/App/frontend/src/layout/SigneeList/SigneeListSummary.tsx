import React from 'react';
import { useParams } from 'react-router-dom';
import type { PropsWithChildren, ReactElement } from 'react';

import { Divider, Paragraph } from '@digdir/designsystemet-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale/nb';

import { Label } from 'src/app-components/Label/Label';
import { Lang } from 'src/features/language/Lang';
import { type SigneeState, useSigneeList } from 'src/layout/SigneeList/api';
import classes from 'src/layout/SigneeList/SigneeListSummary.module.css';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { toTimeZonedDate } from 'src/utils/dateUtils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

interface SigneeListSummaryProps extends Summary2Props {
  titleOverride: string | null | undefined;
}

export function SigneeListSummary({ targetBaseComponentId, titleOverride }: SigneeListSummaryProps) {
  const { instanceOwnerPartyId, instanceGuid, taskId } = useParams();
  const { data, isLoading, error } = useSigneeList(instanceOwnerPartyId, instanceGuid, taskId);

  const originalTitle = useItemWhenType(targetBaseComponentId, 'SigneeList').textResourceBindings?.title;
  const title = titleOverride === undefined ? originalTitle : titleOverride;
  const heading = title ? <Lang id={title} /> : undefined;

  const signatures = data?.filter((signee) => isSignedSignee(signee)) ?? [];

  if (isLoading) {
    return (
      <SigneeListSummaryContainer
        heading={heading}
        baseComponentId={targetBaseComponentId}
        content={SummaryContains.Presentational}
      >
        <Paragraph>
          <Lang id='signee_list_summary.loading' />
        </Paragraph>
      </SigneeListSummaryContainer>
    );
  }

  if (error) {
    return (
      <SigneeListSummaryContainer
        heading={heading}
        baseComponentId={targetBaseComponentId}
        content={SummaryContains.SomeUserContent}
      >
        <Paragraph>
          <Lang id='signee_list_summary.error' />
        </Paragraph>
      </SigneeListSummaryContainer>
    );
  }

  if (signatures.length === 0) {
    return (
      <SigneeListSummaryContainer
        heading={heading}
        baseComponentId={targetBaseComponentId}
        content={SummaryContains.EmptyValueNotRequired}
      >
        <Paragraph>
          <Lang id='signee_list_summary.no_signatures' />
        </Paragraph>
      </SigneeListSummaryContainer>
    );
  }

  return (
    <SigneeListSummaryContainer
      heading={heading}
      baseComponentId={targetBaseComponentId}
      content={SummaryContains.SomeUserContent}
    >
      <ul className={classes.signeeList}>
        {signatures.map((item, index) => (
          <li
            key={`${item.name}-${item.organization}-${item.signedTime}`}
            className={classes.signeeListItem}
          >
            <Paragraph key={index}>
              {item.name ?? <Lang id='signee_list_summary.name_placeholder' />}
              {item.organization && (
                <>
                  , <Lang id='signee_list_summary.on_behalf_of' />
                  {` ${item.organization}`}
                </>
              )}
            </Paragraph>
            <Divider className={classes.divider} />
            <Paragraph className={classes.signeeDescription}>
              <Lang
                id='signee_list_summary.signed_time'
                params={[
                  format(toTimeZonedDate(item.signedTime), "dd.MM.yyyy 'kl.' HH:mm", {
                    locale: nb,
                  }),
                ]}
              />
            </Paragraph>
          </li>
        ))}
      </ul>
    </SigneeListSummaryContainer>
  );
}

interface SigneeListSummaryContentProps extends PropsWithChildren {
  heading: ReactElement | undefined;
  baseComponentId: string;
  content: SummaryContains;
}

function SigneeListSummaryContainer({ baseComponentId, content, heading, children }: SigneeListSummaryContentProps) {
  return (
    <SummaryFlex
      targetBaseId={baseComponentId}
      content={content}
    >
      <div>
        {heading && (
          <Label
            label={heading}
            size='lg'
          />
        )}
        {children}
      </div>
    </SummaryFlex>
  );
}

type SignedSignee = SigneeState & { signedTime: string };

function isSignedSignee(signee: SigneeState): signee is SignedSignee {
  return signee.signedTime !== null;
}
