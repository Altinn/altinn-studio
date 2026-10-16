import React from 'react';
import type { ReactNode } from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';

import { LangReference } from 'src/features/language/Lang';
import type { TextReference } from 'src/features/language/useLanguage';

interface ValidationMessageListProps {
  validations: { message: TextReference }[] | undefined;
  size?: 'sm';
  className?: string;
  icon?: ReactNode;
}

/**
 * Shows each validation's message as a validation message.
 */
export function ValidationMessageList({ validations, size, className, icon }: ValidationMessageListProps) {
  return validations?.map(({ message }, index) => (
    <ValidationMessage
      key={`${message.key ?? message.fallback}-${index}`}
      data-size={size}
      className={className}
    >
      {icon}
      <LangReference reference={message} />
    </ValidationMessage>
  ));
}
