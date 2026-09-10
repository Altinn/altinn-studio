interface ClaimPath {
  path: string[];
  mandatory: boolean;
  display: Array<{ name: string; locale: string }>;
}

interface CredentialConfigSupported {
  doctype?: string;
  vct?: string;
  format: string;
  display: Array<{ name: string; locale: string }>;
  claims: ClaimPath[];
}

/**
 * Extracts the field name from a claim path.
 * For mso_mdoc format (e.g., ["org.iso.18013.5.1.mDL:1", "family_name"]), returns the last element.
 * For sd-jwt format (e.g., ["family_name"]), returns the only element.
 */
function extractFieldName(path: string[]): string {
  return path[path.length - 1];
}

/**
 * Extracts the root element name from a credential configuration.
 * For mso_mdoc format, uses the doctype (e.g., "org.iso.18013.5.1.mDL:1" -> "foererkort")
 * For sd-jwt format, uses a simplified version of the vct
 * Removes hyphens to ensure valid XML element names.
 */
function extractRootElementName(config: CredentialConfigSupported, credentialId: string): string {
  // Extract a simple name from the credential ID
  // e.g., "org.iso.18013.5.1.mDL_mso_mdoc" -> "mDL"
  // or "no.minid.mpid_sd_jwt_vc" -> "mpid"

  let name: string;

  if (config.format === 'mso_mdoc' && config.doctype) {
    // Extract the main part from doctype
    const parts = config.doctype.split('.');
    const lastPart = parts[parts.length - 1];
    // Remove version suffix like ":1"
    name = lastPart.split(':')[0];
  } else if (config.vct) {
    const parts = config.vct.split(':');
    name = parts[parts.length - 1];
  } else {
    // Fallback: extract from credential ID
    const withoutFormat = credentialId.replace(/_mso_mdoc$/, '').replace(/_sd_jwt_vc$/, '');
    const parts = withoutFormat.split('.');
    name = parts[parts.length - 1];
  }

  // Remove hyphens to ensure valid XML element names
  return name.replace(/-/g, '');
}

/**
 * Generates an XSD schema from a credential configuration's claims.
 *
 * @param config - The credential configuration containing claims
 * @param credentialId - The credential identifier (e.g., "org.iso.18013.5.1.mDL_mso_mdoc")
 * @param rootElementName - Optional custom root element name (defaults to extracted name from config)
 * @returns XSD schema as a string
 */
export function generateXsdFromClaims(
  config: CredentialConfigSupported,
  credentialId: string,
  rootElementName?: string,
): string {
  const rootName = rootElementName || extractRootElementName(config, credentialId);

  // Generate xs:element entries for each claim
  const elements = config.claims
    .map((claim) => {
      const fieldName = extractFieldName(claim.path);

      return `        <xs:element minOccurs="0" name="${fieldName}" type="xs:string" />`;
    })
    .join('\n');

  // Get credential display name
  const noDisplay = config.display.find((d) => d.locale === 'no');
  const credentialDisplayName = noDisplay?.name || rootName;

  return `<?xml version="1.0" encoding="utf-8"?>
<xsd:schema xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:seres="http://seres.no/xsd/forvaltningsdata" xmlns:xs="http://www.w3.org/2001/XMLSchema" attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>
      ${credentialDisplayName}
      <xsd:attribute name="rootNode" fixed="" />
    </xs:documentation>
  </xs:annotation>
  <xs:element name="${rootName}">
    <xs:complexType>
      <xs:sequence>
${elements}
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xsd:schema>`;
}

/**
 * Generates XSD schemas for all credential configurations in the options.
 *
 * @param credentialConfigurations - Object mapping credential IDs to their configurations
 * @returns Object mapping credential IDs to their XSD schemas
 */
export function generateAllXsdSchemas(
  credentialConfigurations: Record<string, CredentialConfigSupported>,
): Record<string, string> {
  const schemas: Record<string, string> = {};

  for (const [credentialId, config] of Object.entries(credentialConfigurations)) {
    schemas[credentialId] = generateXsdFromClaims(config, credentialId);
  }

  return schemas;
}

/**
 * Detects the XSD type for a given value based on its runtime type.
 */
function detectXsdType(value: unknown): string {
  if (value === null || value === undefined) {
    return 'xs:string';
  }

  if (typeof value === 'boolean') {
    return 'xs:boolean';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'xs:integer' : 'xs:decimal';
  }

  if (typeof value === 'string') {
    // Try to detect date/datetime patterns
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'xs:date';
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'xs:dateTime';
    }
    return 'xs:string';
  }

  // For arrays and objects, we'll handle them separately
  return 'xs:string';
}

/**
 * Generates XSD element definitions from a claims object recursively.
 */
function generateElementsFromClaims(claims: Record<string, unknown>, indent: string = '        '): string {
  const elements: string[] = [];

  for (const [key, value] of Object.entries(claims)) {
    if (Array.isArray(value)) {
      // Handle arrays - check if it's an array of objects or primitives
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        // Array of objects - create a complex type
        const firstItem = value[0] as Record<string, unknown>;
        const nestedElements = generateElementsFromClaims(firstItem, `${indent}    `);
        elements.push(`${indent}<xs:element minOccurs="0" maxOccurs="unbounded" name="${key}">
${indent}  <xs:complexType>
${indent}    <xs:sequence>
${nestedElements}
${indent}    </xs:sequence>
${indent}  </xs:complexType>
${indent}</xs:element>`);
      } else {
        // Array of primitives
        const type = value.length > 0 ? detectXsdType(value[0]) : 'xs:string';
        elements.push(`${indent}<xs:element minOccurs="0" maxOccurs="unbounded" name="${key}" type="${type}" />`);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested object - create a complex type
      const nestedElements = generateElementsFromClaims(value as Record<string, unknown>, `${indent}    `);
      elements.push(`${indent}<xs:element minOccurs="0" name="${key}">
${indent}  <xs:complexType>
${indent}    <xs:sequence>
${nestedElements}
${indent}    </xs:sequence>
${indent}  </xs:complexType>
${indent}</xs:element>`);
    } else {
      // Simple type
      const type = detectXsdType(value);
      elements.push(`${indent}<xs:element minOccurs="0" name="${key}" type="${type}" />`);
    }
  }

  return elements.join('\n');
}

/**
 * Generates an XSD schema from actual wallet claims data.
 * This analyzes the structure and types of the claims object to create an appropriate schema.
 *
 * @param claims - The claims object received from the wallet API
 * @param docType - The document type (used for root element name)
 * @returns XSD schema as a string
 */
export function generateXsdFromWalletClaims(claims: Record<string, unknown>, docType: string): string {
  const rootName = docType.replace(/-/g, '');
  const elements = generateElementsFromClaims(claims);

  return `<?xml version="1.0" encoding="utf-8"?>
<xsd:schema xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:seres="http://seres.no/xsd/forvaltningsdata" xmlns:xs="http://www.w3.org/2001/XMLSchema" attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xs:annotation>
    <xs:documentation>
      Generated from wallet claims for ${docType}
      <xsd:attribute name="rootNode" fixed="" />
    </xs:documentation>
  </xs:annotation>
  <xs:element name="${rootName}">
    <xs:complexType>
      <xs:sequence>
${elements}
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xsd:schema>`;
}
