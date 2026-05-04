package main

import "testing"

func TestNormalizeLocaltestURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		requestURL       string
		localtestBaseURL string
		wantURL          string
		wantReason       string
		wantErr          bool
	}{
		{
			name:             "no configured base url leaves request unchanged",
			requestURL:       "http://local.altinn.cloud/ttd/app/instance",
			localtestBaseURL: "",
			wantURL:          "http://local.altinn.cloud/ttd/app/instance",
		},
		{
			name:             "non matching host leaves request unchanged",
			requestURL:       "http://example.com/ttd/app/instance",
			localtestBaseURL: "http://local.altinn.cloud:8000",
			wantURL:          "http://example.com/ttd/app/instance",
		},
		{
			name:             "missing port is rewritten to canonical",
			requestURL:       "http://local.altinn.cloud/ttd/app/instance?x=1#frag",
			localtestBaseURL: "http://local.altinn.cloud:8000",
			wantURL:          "http://local.altinn.cloud:8000/ttd/app/instance?x=1#frag",
			wantReason:       "missing_port",
		},
		{
			name:             "port mismatch is rewritten to canonical",
			requestURL:       "http://local.altinn.cloud:80/ttd/app/instance",
			localtestBaseURL: "http://local.altinn.cloud:8000",
			wantURL:          "http://local.altinn.cloud:8000/ttd/app/instance",
			wantReason:       "port_mismatch",
		},
		{
			name:             "scheme mismatch is rewritten to canonical",
			requestURL:       "https://local.altinn.cloud:8000/ttd/app/instance",
			localtestBaseURL: "http://local.altinn.cloud:8000",
			wantURL:          "http://local.altinn.cloud:8000/ttd/app/instance",
			wantReason:       "scheme_mismatch",
		},
		{
			name:             "invalid canonical base returns error",
			requestURL:       "http://local.altinn.cloud/ttd/app/instance",
			localtestBaseURL: "://bad",
			wantURL:          "http://local.altinn.cloud/ttd/app/instance",
			wantErr:          true,
		},
		{
			name:             "invalid request url returns error",
			requestURL:       "://bad",
			localtestBaseURL: "http://local.altinn.cloud:8000",
			wantURL:          "://bad",
			wantErr:          true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			gotURL, gotReason, err := normalizeLocaltestURL(tc.requestURL, tc.localtestBaseURL)
			if (err != nil) != tc.wantErr {
				t.Fatalf("normalizeLocaltestURL() error = %v, wantErr %v", err, tc.wantErr)
			}
			if gotURL != tc.wantURL {
				t.Fatalf("normalizeLocaltestURL() url = %q, want %q", gotURL, tc.wantURL)
			}
			if gotReason != tc.wantReason {
				t.Fatalf("normalizeLocaltestURL() reason = %q, want %q", gotReason, tc.wantReason)
			}
		})
	}
}
