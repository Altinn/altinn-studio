import React from 'react';
import { useSearchParams } from 'react-router-dom';

import { AltinnError } from 'src/components/altinnError';
import { Lang } from 'src/features/language/Lang';

interface ErrorTypeConfig {
  titleKey: string;
  messageKey: string;
  statusCodeKey?: string;
  defaultShowContactInfo: boolean;
}

const ERROR_TYPE_CONFIG: Record<string, ErrorTypeConfig> = {
  xsrf_token_missing: {
    titleKey: 'instantiate.forbidden_action_error_title',
    messageKey: 'instantiate.forbidden_action_error_text',
    statusCodeKey: 'instantiate.forbidden_action_error_status',
    defaultShowContactInfo: true,
  },
  instance_creation_failed: {
    titleKey: 'instantiate.authorization_error_instantiate_validation_title',
    messageKey: 'instantiate.authorization_error_instantiate_validation_title',
    defaultShowContactInfo: true,
  },
  server_error: {
    titleKey: 'instantiate.unknown_error_title',
    messageKey: 'instantiate.unknown_error_text',
    statusCodeKey: 'instantiate.unknown_error_status',
    defaultShowContactInfo: true,
  },
  network_error: {
    titleKey: 'instantiate.unknown_error_title',
    messageKey: 'custom_actions.general_error',
    defaultShowContactInfo: false,
  },
  unknown: {
    titleKey: 'instantiate.unknown_error_title',
    messageKey: 'instantiate.unknown_error_text',
    statusCodeKey: 'instantiate.unknown_error_status',
    defaultShowContactInfo: true,
  },
};

export function ErrorPageContent() {
  const [searchParams] = useSearchParams();

  const errorType = searchParams.get('errorType') || 'unknown';
  const statusCode = searchParams.get('statusCode');
  const showContactInfoParam = searchParams.get('showContactInfo');

  const config = ERROR_TYPE_CONFIG[errorType] || ERROR_TYPE_CONFIG.unknown;

  const showContactInfo = showContactInfoParam === 'true' ? true : config.defaultShowContactInfo;

  // Use statusCode from URL if provided, otherwise use the default from config
  const statusCodeToDisplay = statusCode || (config.statusCodeKey ? <Lang id={config.statusCodeKey} /> : undefined);

  return (
    <AltinnError
      title={<Lang id={config.titleKey} />}
      content={<Lang id={config.messageKey} />}
      statusCode={statusCodeToDisplay}
      showContactInfo={showContactInfo}
    />
  );
}