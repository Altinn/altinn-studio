package doctor

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// maskinportenSection is the configuration section the platform-provisioned Maskinporten client reads.
// .NET configuration keys are case-insensitive, so comparisons here are lower-cased.
const maskinportenSection = "maskinportensettings"

const (
	maskinportenConfigCheckID  = "maskinporten_config"
	maskinportenPackageCheckID = "maskinporten_package"
)

// externalMaskinportenPackage is the NuGet package that v8 supplied to apps transitively through
// Altinn.App.Core, and that v9 no longer depends on.
const externalMaskinportenPackage = "altinn.apiclients.maskinporten"

// isExternalOnlyMaskinportenKey reports whether a settings key only ever appears in the external
// package's shape. Such a key is what separates "this app configured the external client" from "this
// app pinned the built-in one" — the difference between a broken deployment and a redundant setting.
func isExternalOnlyMaskinportenKey(key string) bool {
	switch strings.ToLower(key) {
	case "environment",
		"encodedjwk",
		"encodedx509",
		"certificatepkcs12path",
		"certificatepkcs12password",
		"certificatestorethumbprint",
		"exhangetoaltinntoken",
		"scope",
		"consumerorgno",
		"enterpriseusername",
		"enterpriseuserpassword",
		"enabledebuglogging",
		"clientkey":
		return true
	default:
		return false
	}
}

// isBuiltInMaskinportenSecretKey reports whether a settings key carries a credential in the built-in
// client's shape.
func isBuiltInMaskinportenSecretKey(key string) bool {
	switch strings.ToLower(key) {
	case "jwk", "jwkbase64":
		return true
	default:
		return false
	}
}

// Maskinporten contains Maskinporten configuration checks for the detected app.
type Maskinporten struct {
	Checks    []MaskinportenCheck `json:"checks"`
	HasIssues bool                `json:"hasIssues"`
}

// MaskinportenCheck is one Maskinporten configuration check entry.
type MaskinportenCheck struct {
	ID      string `json:"id"`
	Level   string `json:"level"`
	Path    string `json:"path,omitempty"`
	Message string `json:"message"`
}

// buildMaskinporten inspects the detected app for Maskinporten configuration that conflicts with the
// client the platform provisions.
//
// Every v9 app has a built-in Maskinporten client, and Studio provisions its credentials at deploy
// time as a settings file whose root is a MaskinportenSettings section. That file is applied after
// appsettings.json and configuration merges key by key, so an app that kept its own section under
// that name — as apps using the external Altinn.ApiClients.Maskinporten package were told to — ends up
// with the provisioned clientId spliced into its own credentials while its own key is still used.
// Maskinporten rejects that, only in deployed environments, with nothing failing at startup. The
// v8-to-v9 upgrade reports the same thing, but it is gated to 8.x apps; this check covers apps already
// on v9, which that path can never reach.
func (s *Service) buildMaskinporten(app *App) *Maskinporten {
	if app == nil || !app.Found || app.Path == "" {
		return nil
	}

	checks := s.collectMaskinportenConfigChecks(app.Path)
	if check := s.checkExternalMaskinportenPackage(app.Path); check != nil {
		checks = append(checks, *check)
	}

	if len(checks) == 0 {
		checks = append(checks, MaskinportenCheck{
			ID:      maskinportenConfigCheckID,
			Level:   CheckLevelOK,
			Path:    app.Path,
			Message: "no conflicting MaskinportenSettings section",
		})
	}

	hasIssues := false
	for _, check := range checks {
		if check.Level == CheckLevelWarn || check.Level == CheckLevelError {
			hasIssues = true
			break
		}
	}

	return &Maskinporten{Checks: checks, HasIssues: hasIssues}
}

func (s *Service) collectMaskinportenConfigChecks(appRoot string) []MaskinportenCheck {
	var checks []MaskinportenCheck

	for _, file := range findAppSettingsFiles(appRoot, s.debugf) {
		keys, ok := readMaskinportenSectionKeys(file)
		if !ok {
			continue
		}

		relative, err := filepath.Rel(appRoot, file)
		if err != nil {
			relative = file
		}

		if external := matchingKeys(keys, isExternalOnlyMaskinportenKey); len(external) > 0 {
			checks = append(checks, MaskinportenCheck{
				ID:    maskinportenConfigCheckID,
				Level: CheckLevelError,
				Path:  relative,
				Message: "MaskinportenSettings configures the external client (" + strings.Join(external, ", ") +
					"); the provisioned client owns this section name, so deployed environments will mix the " +
					"two credentials — rename your own section and bind it explicitly",
			})
			continue
		}

		if secrets := matchingKeys(keys, isBuiltInMaskinportenSecretKey); len(secrets) > 0 {
			checks = append(checks, MaskinportenCheck{
				ID:    maskinportenConfigCheckID,
				Level: CheckLevelWarn,
				Path:  relative,
				Message: "MaskinportenSettings contains a checked-in key (" + strings.Join(secrets, ", ") +
					"); Studio provisions these at deploy time, so this is usually redundant",
			})
		}
	}

	return checks
}

// checkExternalMaskinportenPackage reports an app-declared reference to the external package. This is
// informational: such an app builds and runs fine on v9. It is surfaced because it means the app
// maintains a second Maskinporten credential alongside the provisioned one.
func (s *Service) checkExternalMaskinportenPackage(appRoot string) *MaskinportenCheck {
	projectFile := filepath.Join(appRoot, "App", "App.csproj")
	data, err := os.ReadFile(projectFile) //nolint:gosec // G304: path is inside the user's own detected app.
	if err != nil {
		s.debugf("maskinporten: read %s: %v", projectFile, err)
		return nil
	}

	if !strings.Contains(strings.ToLower(string(data)), externalMaskinportenPackage) {
		return nil
	}

	relative, err := filepath.Rel(appRoot, projectFile)
	if err != nil {
		relative = projectFile
	}

	return &MaskinportenCheck{
		ID:    maskinportenPackageCheckID,
		Level: CheckLevelInfo,
		Path:  relative,
		Message: "references the external Altinn.ApiClients.Maskinporten package; the built-in " +
			"IMaskinportenClient is provisioned automatically and can usually replace it",
	}
}

func findAppSettingsFiles(root string, debugf func(format string, args ...any)) []string {
	var files []string

	err := filepath.WalkDir(root, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return nil //nolint:nilerr // An unreadable subtree is not a Maskinporten finding; skip it.
		}
		if entry.IsDir() {
			switch strings.ToLower(entry.Name()) {
			case "bin", "obj", ".git", "node_modules":
				return filepath.SkipDir
			}
			return nil
		}

		name := strings.ToLower(entry.Name())
		if strings.HasPrefix(name, "appsettings") && strings.HasSuffix(name, ".json") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		debugf("maskinporten: walk %s: %v", root, err)
	}

	sort.Strings(files)
	return files
}

// readMaskinportenSectionKeys returns the property names of the file's MaskinportenSettings section.
// The second return value is false when the file has no such section, or cannot be read or parsed —
// an unparseable appsettings file is not a Maskinporten finding, and complaining about it here would
// be a confusing way to learn the JSON is malformed.
func readMaskinportenSectionKeys(path string) ([]string, bool) {
	data, err := os.ReadFile(path) //nolint:gosec // G304: path is inside the user's own detected app.
	if err != nil {
		return nil, false
	}

	var root map[string]json.RawMessage
	if err := json.Unmarshal(relaxJSON(data), &root); err != nil {
		return nil, false
	}

	// Every case-insensitive match is merged rather than returning on the first: Go randomises map
	// iteration, so a file carrying both "MaskinportenSettings" and "maskinportensettings" would
	// otherwise report a different result run to run.
	var keys []string
	found := false

	for name, raw := range root {
		if strings.ToLower(name) != maskinportenSection {
			continue
		}

		var section map[string]json.RawMessage
		if err := json.Unmarshal(raw, &section); err != nil {
			continue
		}

		found = true
		for key := range section {
			keys = append(keys, key)
		}
	}

	return keys, found
}

func matchingKeys(keys []string, matches func(string) bool) []string {
	var matched []string
	for _, key := range keys {
		if matches(key) {
			matched = append(matched, key)
		}
	}
	sort.Strings(matched)
	return matched
}

// relaxJSON rewrites the relaxed JSON that .NET's configuration reader accepts — // and /* */ comments,
// and trailing commas — into something encoding/json will parse. Content inside strings is left alone.
func relaxJSON(data []byte) []byte {
	return removeTrailingCommas(removeComments(data))
}

func removeComments(data []byte) []byte {
	out := make([]byte, 0, len(data))

	for i := 0; i < len(data); i++ {
		if data[i] == '"' {
			end := endOfJSONString(data, i)
			out = append(out, data[i:end]...)
			i = end - 1
			continue
		}

		if end, ok := endOfComment(data, i); ok {
			i = end - 1
			continue
		}

		out = append(out, data[i])
	}

	return out
}

// endOfComment returns the index just past a comment starting at start, and whether one starts there.
// A line comment stops *at* its newline rather than past it, so the newline is copied through and the
// line structure of the document survives the rewrite.
func endOfComment(data []byte, start int) (int, bool) {
	if data[start] != '/' || start+1 >= len(data) {
		return start, false
	}

	switch data[start+1] {
	case '/':
		i := start + 2
		for i < len(data) && data[i] != '\n' {
			i++
		}
		return i, true
	case '*':
		i := start + 2
		for i+1 < len(data) && (data[i] != '*' || data[i+1] != '/') {
			i++
		}
		return min(i+2, len(data)), true
	default:
		return start, false
	}
}

func removeTrailingCommas(data []byte) []byte {
	out := make([]byte, 0, len(data))

	for i := 0; i < len(data); i++ {
		if data[i] == '"' {
			end := endOfJSONString(data, i)
			out = append(out, data[i:end]...)
			i = end - 1
			continue
		}

		if data[i] == ',' && nextSignificantByteClosesContainer(data, i+1) {
			continue
		}

		out = append(out, data[i])
	}

	return out
}

func nextSignificantByteClosesContainer(data []byte, from int) bool {
	for i := from; i < len(data); i++ {
		switch data[i] {
		case ' ', '\t', '\r', '\n':
			continue
		case '}', ']':
			return true
		default:
			return false
		}
	}
	return false
}

// endOfJSONString returns the index just past the string literal starting at start (which must be the
// opening quote), honouring backslash escapes. An unterminated string yields len(data).
func endOfJSONString(data []byte, start int) int {
	for i := start + 1; i < len(data); i++ {
		switch data[i] {
		case '\\':
			i++
		case '"':
			return i + 1
		}
	}
	return len(data)
}
