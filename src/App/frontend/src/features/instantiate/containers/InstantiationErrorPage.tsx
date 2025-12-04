import React from 'react';
import type { RouteProps } from 'react-router-dom';

import { Flex } from 'src/app-components/Flex/Flex';
import { AltinnError } from 'src/components/altinnError';
import { PartySelectionContainer } from 'src/features/instantiate/containers/PartySelectionContainer';

export type IInstantiationErrorPageProps = {
  title: React.ReactNode;
  content: React.ReactNode;
  statusCode?: React.ReactNode;
  showContactInfo?: boolean;
} & RouteProps;

export function InstantiationErrorPage({ content, statusCode, title, showContactInfo }: IInstantiationErrorPageProps) {
  return (
    <PartySelectionContainer>
      <Flex
        container
        direction='row'
      >
        <AltinnError
          title={title}
          content={content}
          statusCode={statusCode}
          showContactInfo={showContactInfo}
        />
      </Flex>
    </PartySelectionContainer>
  );
}
