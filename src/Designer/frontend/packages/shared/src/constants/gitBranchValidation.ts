export const GIT_BRANCH_VALIDATION = {
  INVALID_CHARS: /[\s~^:?*[\]\\@{]/,
  INVALID_PATTERNS: /(\.\.|\/\/|^\/|\/$)/,
  RESERVED_ENDING: /\.lock$/,
} as const;
