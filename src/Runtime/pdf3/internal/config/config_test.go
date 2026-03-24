package config

import "testing"

func TestShouldConfigureOTel(t *testing.T) {
	tests := []struct {
		name        string
		environment string
		endpoint    string
		traces      string
		metrics     string
		want        bool
	}{
		{
			name:        "non localtest always enabled",
			environment: "production",
			want:        true,
		},
		{
			name:        "localtest disabled by default",
			environment: EnvironmentLocaltest,
			want:        false,
		},
		{
			name:        "localtest enabled when generic endpoint is set",
			environment: EnvironmentLocaltest,
			endpoint:    "http://collector:4317",
			want:        true,
		},
		{
			name:        "localtest enabled when traces endpoint is set",
			environment: EnvironmentLocaltest,
			traces:      "http://collector-traces:4317",
			want:        true,
		},
		{
			name:        "localtest enabled when metrics endpoint is set",
			environment: EnvironmentLocaltest,
			metrics:     "http://collector-metrics:4317",
			want:        true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("OTEL_EXPORTER_OTLP_ENDPOINT", tc.endpoint)
			t.Setenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", tc.traces)
			t.Setenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT", tc.metrics)

			got := ShouldConfigureOTel(tc.environment)
			if got != tc.want {
				t.Fatalf("ShouldConfigureOTel() = %v, want %v", got, tc.want)
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
