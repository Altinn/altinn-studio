package app

import (
	"context"
	"slices"
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
	containerbackend "altinn.studio/devenv/pkg/resource/executor/container"
	"altinn.studio/studioctl/internal/config"
	"altinn.studio/studioctl/internal/envtopology"
	"altinn.studio/studioctl/internal/localtestv2"
)

const arbeidsflateLinkPrefix = "PlatformFrontendSettings__Arbeidsflate"

func arbeidsflateLinks(signing *accessTokenSigning) []string {
	var links []string
	entries := newAppRunEnv(
		nil,
		"http://127.0.0.1:5005",
		envtopology.NewLocal("8000"),
		"",
		goldenSecretsDir,
		"",
		signing,
	)
	for _, entry := range entries {
		if strings.HasPrefix(entry, arbeidsflateLinkPrefix) {
			links = append(links, entry)
		}
	}
	return links
}

// The app frontend shows a platform link only when it is configured, so without the arbeidsflate group (minimal mode
// included) the inbox link goes to the front door's Home and the others stay unset; with it all four go into the
// local Arbeidsflate. A run without localtest-v2 sets none.
func TestTheArbeidsflateLinksFollowTheArbeidsflateGroup(t *testing.T) {
	t.Parallel()
	signing := accessTokenSigning{
		FullPath:     goldenCertDir + "/" + localtestv2.CertificateFileName,
		KeysFolder:   "/certs/",
		FileName:     localtestv2.CertificateFileName,
		arbeidsflate: false,
	}
	want := []string{"PlatformFrontendSettings__ArbeidsflateInboxUrl=http://local.altinn.cloud:8000/"}
	if links := arbeidsflateLinks(&signing); !slices.Equal(links, want) {
		t.Fatalf("without the group: %v, want %v", links, want)
	}
	signing.arbeidsflate = true
	want = []string{
		"PlatformFrontendSettings__ArbeidsflateDialogUrl=http://af.local.altinn.cloud:8000/inbox/{dialogId}",
		"PlatformFrontendSettings__ArbeidsflateInboxUrl=http://af.local.altinn.cloud:8000/",
		"PlatformFrontendSettings__ArbeidsflatePartiesUrl=http://af.local.altinn.cloud:8000/profile/parties",
		"PlatformFrontendSettings__ArbeidsflateProfileUrl=http://af.local.altinn.cloud:8000/profile",
	}
	if links := arbeidsflateLinks(&signing); !slices.Equal(links, want) {
		t.Fatalf("with the group: %v, want %v", links, want)
	}
	if links := arbeidsflateLinks(nil); len(links) != 0 {
		t.Fatalf("without localtest-v2: %v, want none", links)
	}
}

func TestTheSigningCarriesTheArbeidsflateGroupFromTheState(t *testing.T) {
	t.Parallel()
	for _, tc := range []struct {
		groups  []string
		minimal bool
		want    bool
	}{
		{groups: nil, minimal: false, want: false},
		{groups: nil, minimal: true, want: false},
		{groups: []string{"dialogporten", "receipt"}, minimal: false, want: false},
		{groups: []string{"arbeidsflate", "dialogporten"}, minimal: false, want: true},
	} {
		cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir()}
		if err := localtestv2.WriteState(cfg, localtestv2.State{
			CertificateDir: localtestv2.CertificateDir(cfg),
			Groups:         tc.groups,
			Dev:            nil,
			LatestImages:   false,
			Minimal:        tc.minimal,
		}); err != nil {
			t.Fatal(err)
		}
		signing, err := NewService(cfg, WithContainerClient(localtestV2Containers(true))).
			nativeAccessTokenSigning(t.Context(), t.TempDir())
		if err != nil {
			t.Fatal(err)
		}
		if signing == nil || signing.arbeidsflate != tc.want {
			t.Fatalf(
				"groups %v, minimal %v: signing %+v, want arbeidsflate %v",
				tc.groups,
				tc.minimal,
				signing,
				tc.want,
			)
		}
	}
}

// A state file whose containers are gone (a reboot, a docker rm) gives a process run no certificate.
func TestAStateFileWithoutContainersGivesNoSigning(t *testing.T) {
	t.Parallel()
	cfg := &config.Config{Home: t.TempDir(), DataDir: t.TempDir()}
	if err := localtestv2.WriteState(
		cfg,
		localtestv2.State{CertificateDir: localtestv2.CertificateDir(cfg)},
	); err != nil {
		t.Fatal(err)
	}
	signing, err := NewService(cfg, WithContainerClient(localtestV2Containers(false))).
		nativeAccessTokenSigning(t.Context(), t.TempDir())
	if err != nil || signing != nil {
		t.Fatalf("signing %+v, %v, want none", signing, err)
	}
}

// localtestV2Containers is a container runtime where a localtest-v2 container runs or none does.
func localtestV2Containers(running bool) localtestv2.ContainerClientFunc {
	return func(context.Context) (container.ContainerClient, error) {
		client := mock.New()
		client.ListContainersFunc = func(_ context.Context, filter types.ContainerListFilter) ([]types.ContainerInfo, error) {
			if !running || filter.Labels[containerbackend.GraphIDLabel] != localtestv2.GraphID {
				return nil, nil
			}
			return []types.ContainerInfo{
				{Name: "localtest-v2-localtest", State: types.ContainerState{Running: true}},
			}, nil
		}
		return client, nil
	}
}

// Every localtest-v2 run gets the platform's logout as the app frontend's logout link, with or without the
// arbeidsflate group; a run without localtest-v2 gets none.
func TestALocaltestV2RunLinksLogoutToThePlatformLogout(t *testing.T) {
	t.Parallel()
	const want = "PlatformFrontendSettings__LogoutUrl=http://local.altinn.cloud:8000/authentication/api/v1/logout"
	for _, signing := range []*accessTokenSigning{
		{FullPath: goldenCertDir + "/" + localtestv2.CertificateFileName, arbeidsflate: false},
		{FullPath: goldenCertDir + "/" + localtestv2.CertificateFileName, arbeidsflate: true},
		nil,
	} {
		entries := newAppRunEnv(
			nil,
			"http://127.0.0.1:5005",
			envtopology.NewLocal("8000"),
			"",
			goldenSecretsDir,
			"",
			signing,
		)
		got := slices.Contains(entries, want)
		if got != (signing != nil) {
			t.Fatalf("signing %+v: logout link set %v, want %v", signing, got, signing != nil)
		}
	}
}
