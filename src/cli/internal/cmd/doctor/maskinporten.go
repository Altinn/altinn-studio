package doctor

import (
	"errors"
	"fmt"

	"altinn.studio/studioctl/internal/appsecrets"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
)

// checkMaskinportenClientState reports whether a Maskinporten client is stored for the detected app.
//
// The app has one Maskinporten identity and never configures its own credentials: it reads whatever the
// platform provisions. Deployed, Studio provisions them; on a local run studioctl is the platform and cannot
// yet hand over the credentials Studio issues, so a developer testing against a real external API supplies a
// client for it to provision instead. Maskinporten grants scopes per client registration, so that supplied
// client needs the same scopes selected in Studio. Not every app calls an external API from a local run, so
// a missing client is information rather than a problem - the check says which state you are in and what to
// run to change it.
func (s *Service) checkMaskinportenClientState(appPath string) DiskCheck {
	const id = "maskinporten_client"

	appID, err := appsvc.ReadAppID(appPath)
	if err != nil {
		return DiskCheck{
			ID:      id,
			Level:   diskLevelWarn,
			Path:    appPath,
			Message: "cannot read the app id: " + err.Error(),
		}
	}

	dir, err := s.cfg.AppSecretsDir(appID)
	if err != nil {
		return DiskCheck{
			ID:      id,
			Level:   diskLevelWarn,
			Path:    appPath,
			Message: "cannot place the app's secrets directory: " + err.Error(),
		}
	}

	client, err := appsecrets.LoadMaskinportenClient(dir)
	if errors.Is(err, appsecrets.ErrNoMaskinportenClient) {
		return DiskCheck{
			ID:    id,
			Level: diskLevelInfo,
			Path:  dir,
			Message: "no Maskinporten client stored for " + appID +
				"; supply one with 'studioctl app maskinporten set' to call an external API from a local run. " +
				"A local run cannot use the credentials Studio provisions, and Maskinporten grants scopes per " +
				"client registration, so the client you supply needs the same scopes selected in Studio.",
		}
	}
	if err != nil {
		return DiskCheck{
			ID:      id,
			Level:   diskLevelWarn,
			Path:    dir,
			Message: "cannot read the stored Maskinporten client: " + err.Error(),
		}
	}

	summary := client.Summary()
	return DiskCheck{
		ID:    id,
		Level: diskLevelOK,
		Path:  dir,
		Message: fmt.Sprintf(
			"Maskinporten client stored for %s (client id %s, %s). A local run uses it in place of the "+
				"credentials Studio provisions, and Maskinporten grants scopes per client registration, so it "+
				"needs the same scopes selected in Studio.",
			appID,
			summary.ClientID,
			summary.Environment,
		),
	}
}
