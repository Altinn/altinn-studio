package self

import "strings"

const windowsPathListSeparator = ";"

// appendPathListEntry appends dir to a Windows PATH value unless an entry already names it.
func appendPathListEntry(value, dir string, expand func(string) string) (string, bool) {
	for entry := range strings.SplitSeq(value, windowsPathListSeparator) {
		if samePathEntry(entry, dir, expand) {
			return value, false
		}
	}
	if value == "" || strings.HasSuffix(value, windowsPathListSeparator) {
		return value + dir, true
	}
	return value + windowsPathListSeparator + dir, true
}

// removePathListEntry removes the entries of a Windows PATH value that name dir.
func removePathListEntry(value, dir string, expand func(string) string) (string, bool) {
	entries := strings.Split(value, windowsPathListSeparator)
	kept := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !samePathEntry(entry, dir, expand) {
			kept = append(kept, entry)
		}
	}
	if len(kept) == len(entries) {
		return value, false
	}
	return strings.Join(kept, windowsPathListSeparator), true
}

// samePathEntry compares a PATH entry with dir the way Windows resolves them: after expanding
// environment variables, ignoring case, surrounding quotes and trailing separators.
func samePathEntry(entry, dir string, expand func(string) string) bool {
	normalized := normalizePathEntry(expand(entry))
	return normalized != "" && strings.EqualFold(normalized, normalizePathEntry(dir))
}

func normalizePathEntry(entry string) string {
	return strings.TrimRight(strings.Trim(strings.TrimSpace(entry), `"`), `\/`)
}
