package appurl

import (
	"errors"
	"testing"
)

const (
	instancePath = "/instance/512345/0fc98a23-fe31-4ef5-8fb9-dd3f479354cd?pdf=1&lang=nb"
	tt02         = "tt02.altinn.no"
)

func TestParse(t *testing.T) {
	tests := []struct {
		wantErr     error
		want        App
		name        string
		url         string
		appHostname string
	}{
		{
			name:        "tt02 app",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/frontend-test" + instancePath,
			appHostname: tt02,
			want:        App{Org: "ttd", App: "frontend-test"},
		},
		{
			name:        "prod app",
			url:         "https://skd.apps.altinn.no/skd/mva-melding" + instancePath,
			appHostname: "altinn.no",
			want:        App{Org: "skd", App: "mva-melding"},
		},
		{
			name:        "at22 app",
			url:         "https://ttd.apps.at22.altinn.cloud/ttd/app/",
			appHostname: "at22.altinn.cloud",
			want:        App{Org: "ttd", App: "app"},
		},
		{
			name:        "subform URL",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/instance/1/abc/Task_1/subform/comp/data/?pdf=1&lang=nb",
			appHostname: tt02,
			want:        App{Org: "ttd", App: "app"},
		},
		{
			name:        "hash routed URL",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/#/instance/1/abc?pdf=1",
			appHostname: tt02,
			want:        App{Org: "ttd", App: "app"},
		},
		{
			name:        "mixed case is normalized",
			url:         "https://TTD.apps.TT02.altinn.no/Ttd/My-App/",
			appHostname: tt02,
			want:        App{Org: "ttd", App: "my-app"},
		},
		{name: "http", url: "http://ttd.apps.tt02.altinn.no/ttd/app/", appHostname: tt02, wantErr: ErrScheme},
		{name: "javascript", url: "javascript:alert(1)", appHostname: tt02, wantErr: ErrScheme},
		{name: "file", url: "file:///etc/passwd", appHostname: tt02, wantErr: ErrScheme},
		{
			name:        "port",
			url:         "https://ttd.apps.tt02.altinn.no:8443/ttd/app/",
			appHostname: tt02,
			wantErr:     ErrUserInfoOrPort,
		},
		{
			name:        "user info",
			url:         "https://ttd.apps.tt02.altinn.no@evil.example/ttd/app/",
			appHostname: tt02,
			wantErr:     ErrUserInfoOrPort,
		},
		{
			name:        "backslash host confusion",
			url:         `https://evil.example\@ttd.apps.tt02.altinn.no/ttd/app/`,
			appHostname: tt02,
			wantErr:     ErrInvalidURL,
		},
		{
			name:        "backslash dot segments",
			url:         `https://ttd.apps.tt02.altinn.no/ttd/app/x\..\..\..\nav\app\`,
			appHostname: tt02,
			wantErr:     ErrInvalidURL,
		},
		{
			name:        "control character",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/\n",
			appHostname: tt02,
			wantErr:     ErrInvalidURL,
		},
		{
			name:        "suffix attack",
			url:         "https://ttd.apps.tt02.altinn.no.evil.example/ttd/app/",
			appHostname: tt02,
			wantErr:     ErrHost,
		},
		{name: "trailing dot", url: "https://ttd.apps.tt02.altinn.no./ttd/app/", appHostname: tt02, wantErr: ErrHost},
		{
			name:        "other environment",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/",
			appHostname: "altinn.no",
			wantErr:     ErrHost,
		},
		{
			name:        "nested org label",
			url:         "https://a.ttd.apps.tt02.altinn.no/ttd/app/",
			appHostname: tt02,
			wantErr:     ErrHost,
		},
		{name: "no org label", url: "https://apps.tt02.altinn.no/ttd/app/", appHostname: tt02, wantErr: ErrHost},
		{
			name:        "platform host",
			url:         "https://platform.tt02.altinn.no/storage/api/v1/",
			appHostname: tt02,
			wantErr:     ErrHost,
		},
		{name: "IP address", url: "https://169.254.169.254/ttd/app/", appHostname: tt02, wantErr: ErrHost},
		{name: "cluster service", url: "https://kubernetes.default.svc/ttd/app/", appHostname: tt02, wantErr: ErrHost},
		{name: "no app segment", url: "https://ttd.apps.tt02.altinn.no/ttd/", appHostname: tt02, wantErr: ErrPath},
		{
			name:        "no trailing slash",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app",
			appHostname: tt02,
			wantErr:     ErrPath,
		},
		{name: "root", url: "https://ttd.apps.tt02.altinn.no/", appHostname: tt02, wantErr: ErrPath},
		{
			name:        "encoded slash in org",
			url:         "https://ttd.apps.tt02.altinn.no/ttd%2Fx/app/",
			appHostname: tt02,
			wantErr:     ErrPath,
		},
		{
			name:        "org mismatch",
			url:         "https://ttd.apps.tt02.altinn.no/nav/app/",
			appHostname: tt02,
			wantErr:     ErrOrgMismatch,
		},
		{
			name:        "double dot",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/../../nav/app/",
			appHostname: tt02,
			wantErr:     ErrDotSegment,
		},
		{name: "dot", url: "https://ttd.apps.tt02.altinn.no/ttd/./app/", appHostname: tt02, wantErr: ErrDotSegment},
		{
			name:        "encoded double dot",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/%2E%2e/%2e./.%2E/nav/app/",
			appHostname: tt02,
			wantErr:     ErrDotSegment,
		},
		{
			name:        "empty hostname",
			url:         "https://ttd.apps.tt02.altinn.no/ttd/app/",
			appHostname: "",
			wantErr:     errEmptyAppHostname,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Parse(tc.url, tc.appHostname)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("Parse(%q) error = %v, want %v", tc.url, err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Parse(%q) unexpected error: %v", tc.url, err)
			}
			if got != tc.want {
				t.Fatalf("Parse(%q) = %+v, want %+v", tc.url, got, tc.want)
			}
		})
	}
}
