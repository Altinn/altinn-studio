import React, { useState } from 'react';

import { Flex, Input, LabelComponent } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Paragraph, ValidationMessage } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { checksumAlgorithmOf } from 'src/layout/BrokerFileTransfer/brokerClient/initializeFileTransfer';
import classes from 'src/layout/BrokerFileTransfer/ChecksumField.module.css';
import { checksumProblem } from 'src/layout/BrokerFileTransfer/messages';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import { useShowOptionalIndicator } from 'src/utils/layout/useShowOptionalIndicator';

type ChecksumFieldProps = {
  baseComponentId: string;
  value: string;
  onChange?: (checksum: string) => void;
};

/** The field for the file's checksum when the component asks for one, showing MD5 or SHA256 once it is valid */
export function ChecksumField({ baseComponentId, value, onChange }: ChecksumFieldProps) {
  const config = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const title = useEvalOptionalText(
    config.textResourceBindings?.checksumTitle,
    Expressions.BrokerFileTransfer.textResourceBindings.checksumTitle,
  );
  const help = useEvalOptionalText(
    config.textResourceBindings?.checksumHelp,
    Expressions.BrokerFileTransfer.textResourceBindings.checksumHelp,
  );
  const id = `${useIndexedId(baseComponentId)}-checksum`;
  const showOptionalMarking = useShowOptionalIndicator(config.labelSettings);
  const [hasLeft, setHasLeft] = useState(false);

  if (!config.checksumField) {
    return null;
  }

  const required = config.checksumField === 'required';
  const readOnly = !onChange;
  const problem = value ? checksumProblem(value) : undefined;
  const shownProblem = hasLeft && !readOnly ? problem : undefined;
  const algorithm = value && !problem ? checksumAlgorithmOf(value) : undefined;
  const labelId = `${id}-label`;
  const problemId = `${id}-problem`;
  const algorithmId = `${id}-algorithm`;

  return (
    <div className={classes.field}>
      <LabelComponent
        id={labelId}
        htmlFor={id}
        title={title || 'broker_file_transfer.checksum'}
        help={help || 'broker_file_transfer.checksum_help'}
        required={required}
        readOnly={readOnly}
        showOptionalMarking={showOptionalMarking}
      >
        <Flex
          item
          size={{ xs: 12 }}
        >
          <Input
            id={id}
            aria-labelledby={labelId}
            aria-describedby={shownProblem ? problemId : algorithm ? algorithmId : undefined}
            value={value}
            readOnly={readOnly}
            required={required}
            error={!!shownProblem}
            autoComplete='off'
            onChange={(event) => onChange?.(event.target.value.trim().toLowerCase())}
            onBlur={() => setHasLeft(true)}
          />
        </Flex>
      </LabelComponent>
      {shownProblem && (
        <ValidationMessage
          id={problemId}
          data-size='sm'
        >
          <Lang id={shownProblem.key} />
        </ValidationMessage>
      )}
      {algorithm && (
        <Paragraph
          id={algorithmId}
          data-size='sm'
        >
          <Lang
            id='broker_file_transfer.checksum_algorithm'
            params={[algorithm]}
          />
        </Paragraph>
      )}
    </div>
  );
}
