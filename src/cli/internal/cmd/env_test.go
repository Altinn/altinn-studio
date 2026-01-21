package cmd_test

import (
	"testing"

	cmd "altinn.studio/studioctl/internal/cmd"
)

func TestEnvCommand_parseUpFlags_PortValidation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		args    []string
		wantErr bool
		want    int
	}{
		{name: "default port sentinel", args: nil, wantErr: false, want: 0},
		{name: "explicit zero treated as default", args: []string{"--port=0"}, wantErr: false, want: 0},
		{name: "valid min", args: []string{"--port=1"}, wantErr: false, want: 1},
		{name: "valid max", args: []string{"--port=65535"}, wantErr: false, want: 65535},
		{name: "negative", args: []string{"--port=-1"}, wantErr: true},
		{name: "too large", args: []string{"--port=65536"}, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotPort, _, err := cmd.ExportParseUpPort(tt.args)
			if (err != nil) != tt.wantErr {
				t.Fatalf("error = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && gotPort != tt.want {
				t.Fatalf("port = %d, want %d", gotPort, tt.want)
			}
		})
	}
}
