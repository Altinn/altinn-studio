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
