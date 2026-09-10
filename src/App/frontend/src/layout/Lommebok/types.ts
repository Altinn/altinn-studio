import slugify from 'slugify';

import credentialOptions from 'src/layout/Lommebok/options.json';

// Generate credential type keys from options.json
export const credentialTypes = Object.keys(credentialOptions.credential_configurations_supported).map(
  (credentialId) => {
    const config = credentialOptions.credential_configurations_supported[credentialId];
    // Use the first Norwegian locale display name and slugify it
    const displayName = config.display.find((d) => d.locale === 'no')?.name || credentialId;
    return slugify(displayName, { lower: true, strict: true, locale: 'nb' });
  },
);
