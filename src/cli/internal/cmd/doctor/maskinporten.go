package doctor

import (
	"errors"
	"fmt"

	"altinn.studio/studioctl/internal/appsecrets"
	appsvc "altinn.studio/studioctl/internal/cmd/app"
)

// checkMaskinportenClientState reports whether a Maskinporten client is stored for the detected app.
//
// A v9 app has two Maskinporten clients, not one: the client Studio provisions for the deployed app, and
// the client stored here, which a local run uses when it calls an external API for real. They are granted
// their scopes separately, so an app that works when deployed can still fail locally and the other way
// round. Not every app needs a local client, so a missing one is information rather than a problem - the
// check exists to say which of the two states you are in, and what to run to change it.
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
				"; store one with 'studioctl app maskinporten set' to call an external API from a local run. " +
				"It is a separate client from the one Studio provisions for the deployed app, and needs the " +
				"same scopes granted on it.",
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
			"Maskinporten client stored for %s (client id %s, %s). Its scopes are granted separately from the "+
				"client Studio provisions for the deployed app.",
			appID,
			summary.ClientID,
			summary.Environment,
		),
	}
}
