package doctor

import (
	"errors"

	"altinn.studio/studioctl/internal/appsecrets"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
)

// maskinportenCheckID names the disk check, in the report and in the tests that assert on it.
const maskinportenCheckID = "maskinporten_client"

// checkMaskinportenClientState reports whether a Maskinporten client is stored for the detected app.
//
// It reports state, not advice: most apps never call an external API from a local run, so having no client
// is the ordinary case and says nothing about the health of the installation. What a client is for, and why
// its scopes have to match the ones selected in Studio, belongs to `app upgrade v9` and the app-development
// skill, which have the app in front of them; repeating it here would put a paragraph about an integration
// most apps do not have in the middle of a health report.
//
// The second return is false when the check has nothing to say - an app whose id cannot be read, because
// detection accepts a project file alone and metadata may not exist yet. That is a fact about the app's
// metadata rather than about Maskinporten, and reporting it here would attribute it to the wrong thing and
// color the whole report through Disk.HasIssues.
func (s *Service) checkMaskinportenClientState(appPath string) (DiskCheck, bool) {
	// The zero value is never read when the second return is false; a named variable keeps it out of
	// exhaustruct's way without spelling out every field twice.
	var unreported DiskCheck

	appID, err := appsvc.ReadAppID(appPath)
	if err != nil {
		return unreported, false
	}

	dir, err := s.cfg.AppSecretsDir(appID)
	if err != nil {
		return unreported, false
	}

	client, err := appsecrets.LoadMaskinportenClient(dir)
	if errors.Is(err, appsecrets.ErrNoMaskinportenClient) {
		return DiskCheck{
			ID:      maskinportenCheckID,
			Level:   diskLevelInfo,
			Path:    dir,
			Message: "no local Maskinporten client configured",
		}, true
	}
	if err != nil {
		// A file is there and cannot be used, which does break a local run that needs it.
		return DiskCheck{
			ID:      maskinportenCheckID,
			Level:   diskLevelWarn,
			Path:    dir,
			Message: "stored Maskinporten client cannot be read: " + err.Error(),
		}, true
	}

	summary := client.Summary()
	return DiskCheck{
		ID:      maskinportenCheckID,
		Level:   diskLevelOK,
		Path:    dir,
		Message: "local Maskinporten client configured (" + summary.ClientID + ", " + summary.Environment + ")",
	}, true
}
