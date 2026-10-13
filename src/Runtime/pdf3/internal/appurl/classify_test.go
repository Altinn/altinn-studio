package appurl

import "testing"

func TestClassify(t *testing.T) {
	const (
		app      = "https://ttd.apps.tt02.altinn.no/ttd/frontend-test/"
		instance = "instance/512345/0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"
		subform  = "/Task_1/subform/subform-comp/b3a5d2a4-7f62-4d0e-9b6e-1c2d3e4f5a6b/"
	)

	tests := []struct {
		name        string
		url         string
		appHostname string
		want        Kind
		wantReason  string
	}{
		// app-lib v9: PdfGeneratorSettings.AppPdfPagePathTemplate = "instance/{instanceId}?pdf=1"
		{name: "v9", url: app + instance + "?pdf=1&lang=nb", want: KindStandard},
		{name: "v9 without lang", url: app + instance + "?pdf=1", want: KindStandard},
		{name: "v9 auto PDF tasks", url: app + instance + "?pdf=1&lang=en&task=Task_1&task=Task_2", want: KindStandard},
		{name: "v9 subform", url: app + instance + subform + "?pdf=1&lang=nb", want: KindStandard},
		{
			name:        "prod",
			url:         "https://skd.apps.altinn.no/skd/mva/" + instance + "?pdf=1&lang=nb",
			appHostname: "altinn.no",
			want:        KindStandard,
		},
		{
			name: "upper case GUID",
			url:  app + "instance/1/0FC98A23-FE31-4EF5-8FB9-DD3F479354CD?pdf=1",
			want: KindStandard,
		},
		// app-lib v8: PdfGeneratorSettings.AppPdfPagePathTemplate = "#/instance/{instanceId}?pdf=1"
		{name: "v8", url: app + "#/" + instance + "?pdf=1&lang=nb", want: KindStandard},
		{name: "v8 auto PDF tasks", url: app + "#/" + instance + "?pdf=1&lang=nb&task=Task_1", want: KindStandard},
		{name: "v8 subform", url: app + "#/" + instance + subform + "?pdf=1&lang=nb", want: KindStandard},

		{name: "no pdf=1", url: app + instance + "?lang=nb", want: KindAppOther},
		{name: "pdf=0", url: app + instance + "?pdf=0&lang=nb", want: KindAppOther},
		{name: "pdf twice", url: app + instance + "?pdf=1&pdf=1", want: KindAppOther},
		{name: "extra query parameter", url: app + instance + "?pdf=1&lang=nb&print=custom", want: KindAppOther},
		{name: "malformed query", url: app + instance + "?pdf=1;lang=nb", want: KindAppOther},
		{name: "custom page", url: app + "custom-pdf?pdf=1", want: KindAppOther},
		{name: "app root", url: app, want: KindAppOther},
		{name: "instance without GUID", url: app + "instance/512345/abc?pdf=1", want: KindAppOther},
		{name: "extra path segment", url: app + instance + "/Task_1?pdf=1", want: KindAppOther},
		{name: "v9 with fragment", url: app + instance + "?pdf=1#/other", want: KindAppOther},
		{name: "v8 query outside fragment", url: app + "?pdf=1#/" + instance, want: KindAppOther},
		{name: "v8 fragment under a page", url: app + "page#/" + instance + "?pdf=1", want: KindAppOther},
		{name: "v8 custom route", url: app + "#/custom?pdf=1", want: KindAppOther},
		{name: "app API", url: app + "api/v1/data", want: KindAppOther},

		{
			name:       "other host",
			url:        "https://example.com/ttd/frontend-test/" + instance + "?pdf=1",
			want:       KindOther,
			wantReason: "host",
		},
		{
			name:       "other environment",
			url:        "https://ttd.apps.at22.altinn.cloud/ttd/frontend-test/" + instance + "?pdf=1",
			want:       KindOther,
			wantReason: "host",
		},
		{name: "platform", url: "https://platform.tt02.altinn.no/storage/api/v1/", want: KindOther, wantReason: "host"},
		{name: "http", url: "http://ttd.apps.tt02.altinn.no/ttd/frontend-test/", want: KindOther, wantReason: "scheme"},
		{name: "file", url: "file:///etc/passwd", want: KindOther, wantReason: "scheme"},
		{
			name:       "port",
			url:        "https://ttd.apps.tt02.altinn.no:8443/ttd/frontend-test/",
			want:       KindOther,
			wantReason: "user_info_or_port",
		},
		{
			name:       "user info",
			url:        "https://ttd.apps.tt02.altinn.no@evil.example/ttd/frontend-test/",
			want:       KindOther,
			wantReason: "user_info_or_port",
		},
		{
			name:       "backslash",
			url:        `https://evil.example\@ttd.apps.tt02.altinn.no/ttd/frontend-test/`,
			want:       KindOther,
			wantReason: "invalid",
		},
		{
			name:       "org mismatch",
			url:        "https://ttd.apps.tt02.altinn.no/nav/app/" + instance + "?pdf=1",
			want:       KindOther,
			wantReason: "org_mismatch",
		},
		{
			name:       "dot segments",
			url:        app + "../../nav/app/" + instance + "?pdf=1",
			want:       KindOther,
			wantReason: "dot_segment",
		},
		{
			name:       "encoded dot segments",
			url:        app + "%2e%2e/%2e%2e/nav/app/" + instance + "?pdf=1",
			want:       KindOther,
			wantReason: "dot_segment",
		},
		{name: "no app", url: "https://ttd.apps.tt02.altinn.no/ttd/", want: KindOther, wantReason: "path"},
		{name: "empty", url: "", want: KindOther, wantReason: "scheme"},
		{name: "control character", url: app + "\n", want: KindOther, wantReason: "invalid"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			appHostname := tc.appHostname
			if appHostname == "" {
				appHostname = tt02
			}
			got, reason := Classify(tc.url, appHostname)
			if got != tc.want || reason != tc.wantReason {
				t.Fatalf("Classify(%q) = %q, %q, want %q, %q", tc.url, got, reason, tc.want, tc.wantReason)
			}
		})
	}
}
