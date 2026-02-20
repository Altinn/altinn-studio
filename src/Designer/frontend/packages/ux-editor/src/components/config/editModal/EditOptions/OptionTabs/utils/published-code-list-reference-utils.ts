import { Guard } from '@studio/guard';
import type { PublishedCodeListReferenceValues } from '../types/PublishedCodeListReferenceValues';

export function isPublishedCodeListReferenceString(id: string, orgName: string): boolean {
  if (!publishedCodeListReferenceRegex.test(id)) return false;
  const values = extractValuesFromPublishedCodeListReferenceString(id);
  Guard.againstNull(values);
  return values.orgName === orgName;
}

export function extractValuesFromPublishedCodeListReferenceString(
  id: string,
): PublishedCodeListReferenceValues | null {
  const match = publishedCodeListReferenceRegex.exec(id);
  if (!match) return null;
  const [_, orgName, codeListName, version] = match;
  return { orgName, codeListName, version };
}

export function createPublishedCodeListReferenceString({
  orgName,
  codeListName,
  version,
}: PublishedCodeListReferenceValues): string {
  return `lib**${orgName}**${codeListName}**${version}`;
}

const publishedCodeListReferenceRegex = /^lib\*\*([^*]+)\*\*([^*]+)\*\*(\d+|_latest)$/; // Named capturing groups would make this Regex more readable, but that's not supported by the current Ecmascript version
