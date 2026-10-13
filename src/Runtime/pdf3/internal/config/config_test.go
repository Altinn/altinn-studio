package config

import "testing"

func TestResolveOTelSignals(t *testing.T) {
	all := OTelSignals{Traces: true, Metrics: true, Logs: true}
	tests := []struct {
		env         map[string]string
		name        string
		environment string
		want        OTelSignals
	}{
		{name: "cluster exports everything", environment: "prod", want: all},
		{name: "localtest exports nothing by default", environment: EnvironmentLocaltest},
		{
			name:        "localtest generic endpoint exports everything",
			environment: EnvironmentLocaltest,
			env:         map[string]string{"OTEL_EXPORTER_OTLP_ENDPOINT": "http://collector:4317"},
			want:        all,
		},
		{
			name:        "localtest traces endpoint exports only traces",
			environment: EnvironmentLocaltest,
			env:         map[string]string{"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT": "http://traces:4317"},
			want:        OTelSignals{Traces: true},
		},
		{
			name:        "localtest metrics endpoint exports only metrics",
			environment: EnvironmentLocaltest,
			env:         map[string]string{"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT": "http://metrics:4317"},
			want:        OTelSignals{Metrics: true},
		},
		{
			name:        "localtest logs endpoint exports only logs",
			environment: EnvironmentLocaltest,
			env:         map[string]string{"OTEL_EXPORTER_OTLP_LOGS_ENDPOINT": "http://logs:4317"},
			want:        OTelSignals{Logs: true},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			for _, key := range []string{
				"OTEL_EXPORTER_OTLP_ENDPOINT",
				"OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
				"OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
				"OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
			} {
				t.Setenv(key, tc.env[key])
			}

			got := ResolveOTelSignals(tc.environment)
			if got != tc.want {
				t.Fatalf("ResolveOTelSignals() = %+v, want %+v", got, tc.want)
			}
			if got.Any() != (tc.want != OTelSignals{}) {
				t.Errorf("Any() = %v for %+v", got.Any(), got)
			}
		})
	}
}

func TestPDFAConversionConfigEnabledFor(t *testing.T) {
	tests := []struct {
		name         string
		environment  string
		serviceOwner string
		cfg          PDFAConversionConfig
		want         bool
	}{
		{
			name:         "combo target enabled",
			environment:  "tt02",
			serviceOwner: "ikta",
			cfg:          defaultPDFAConversionConfig,
			want:         true,
		},
		{
			name:         "wrong service owner disabled",
			environment:  "tt02",
			serviceOwner: "ttd",
			cfg:          defaultPDFAConversionConfig,
			want:         false,
		},
		{
			name:         "wrong environment disabled",
			environment:  "proda",
			serviceOwner: "ikta",
			cfg:          defaultPDFAConversionConfig,
			want:         false,
		},
		{
			name:         "combo match ignores case and whitespace",
			environment:  " TT02 ",
			serviceOwner: " IKTA ",
			cfg:          defaultPDFAConversionConfig,
			want:         true,
		},
		{
			name:         "target can require environment and service owner together",
			environment:  "tt02",
			serviceOwner: "ikta",
			cfg: PDFAConversionConfig{
				Targets: []PDFATarget{
					{Environment: "tt02", ServiceOwner: "ikta"},
				},
			},
			want: true,
		},
		{
			name:         "combo target rejects partial match",
			environment:  "tt02",
			serviceOwner: "ttd",
			cfg: PDFAConversionConfig{
				Targets: []PDFATarget{
					{Environment: "tt02", ServiceOwner: "ikta"},
				},
			},
			want: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.cfg.EnabledFor(tc.environment, tc.serviceOwner)
			if got != tc.want {
				t.Fatalf("EnabledFor() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestConfigShouldConvertToPDFA(t *testing.T) {
	tests := []struct {
		name         string
		environment  string
		serviceOwner string
		pdfa         PDFAConversionConfig
		want         bool
	}{
		{
			name:         "matches ikta in tt02",
			environment:  "tt02",
			serviceOwner: "ikta",
			pdfa:         defaultPDFAConversionConfig,
			want:         true,
		},
		{
			name:         "wrong service owner disabled",
			environment:  "tt02",
			serviceOwner: "ttd",
			pdfa:         defaultPDFAConversionConfig,
			want:         false,
		},
		{
			name:         "wrong environment disabled",
			environment:  "proda",
			serviceOwner: "ikta",
			pdfa:         defaultPDFAConversionConfig,
			want:         false,
		},
		{
			name:         "combo target is applied",
			environment:  "tt02",
			serviceOwner: "ikta",
			pdfa: PDFAConversionConfig{
				Targets: []PDFATarget{
					{Environment: "tt02", ServiceOwner: "ikta"},
				},
			},
			want: true,
		},
		{
			name:         "combo target rejects wrong service owner",
			environment:  "tt02",
			serviceOwner: "ttd",
			pdfa: PDFAConversionConfig{
				Targets: []PDFATarget{
					{Environment: "tt02", ServiceOwner: "ikta"},
				},
			},
			want: false,
		},
		{
			name:        "empty disabled",
			environment: "prod",
			pdfa:        PDFAConversionConfig{},
			want:        false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cfg := &Config{
				Environment:  tc.environment,
				ServiceOwner: tc.serviceOwner,
				PDFA:         tc.pdfa,
			}
			got := cfg.ShouldConvertToPDFA()
			if got != tc.want {
				t.Fatalf("ShouldConvertToPDFA() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestReadConfigIncludesPDFAConfig(t *testing.T) {
	t.Run("combo target", func(t *testing.T) {
		t.Setenv("PDF3_ENVIRONMENT", "tt02")
		t.Setenv(ServiceOwnerEnv, "ikta")

		cfg := ReadConfig()
		if !cfg.ShouldConvertToPDFA() {
			t.Fatalf("ReadConfig().ShouldConvertToPDFA() = false, want true")
		}
	})

	t.Run("wrong service owner disabled", func(t *testing.T) {
		t.Setenv("PDF3_ENVIRONMENT", "tt02")
		t.Setenv(ServiceOwnerEnv, "ttd")

		cfg := ReadConfig()
		if cfg.ShouldConvertToPDFA() {
			t.Fatalf("ReadConfig().ShouldConvertToPDFA() = true, want false")
		}
	})
}

func TestReadConfigAppHostname(t *testing.T) {
	tests := map[string]string{
		"at22":      "at22.altinn.cloud",
		"at23":      "at23.altinn.cloud",
		"at24":      "at24.altinn.cloud",
		"yt01":      "yt01.altinn.cloud",
		"tt02":      "tt02.altinn.no",
		"prod":      "altinn.no",
		"local":     "",
		"localtest": "",
		"unknown":   "",
	}
	for environment, want := range tests {
		t.Run(environment, func(t *testing.T) {
			t.Setenv("PDF3_ENVIRONMENT", environment)
			if got := ReadConfig().AppHostname; got != want {
				t.Fatalf("AppHostname = %q, want %q", got, want)
			}
		})
	}
}
