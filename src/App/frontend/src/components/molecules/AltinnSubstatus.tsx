import React from 'react';

import { Flex } from '@app/form-component';
import { Paragraph } from '@digdir/designsystemet-react';

import classes from 'src/components/molecules/AltinnSubstatus.module.css';

export interface IInformationPaperProps {
  label: React.ReactNode;
  description: React.ReactNode;
}

export function AltinnSubstatus({ label, description }: IInformationPaperProps) {
  return (
    <div className={classes.container}>
      <Flex
        container
        direction='column'
      >
        <Flex item>
          <Paragraph
            id='substatus-label'
            style={{
              fontSize: '1.5rem',
              marginBottom: description ? '0.5rem' : '',
            }}
          >
            {label}
          </Paragraph>
        </Flex>
        <Flex item>
          <Paragraph
            id='substatus-description'
            style={{ fontSize: '1.125rem' }}
          >
            {description}
          </Paragraph>
        </Flex>
      </Flex>
    </div>
  );
}
