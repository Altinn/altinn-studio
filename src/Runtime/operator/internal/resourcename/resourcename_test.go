package resourcename

import (
	"testing"

	. "github.com/onsi/gomega"
)

func TestParseMaskinportenClientName(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		wantOwnerId    string
		wantAppId      string
		wantErr        bool
		wantErrContain string
	}{
		{
			name:        "simple name",
			input:       "ttd-app",
			wantOwnerId: "ttd",
			wantAppId:   "app",
		},
		{
			name:        "app id with hyphen",
			input:       "ttd-my-app",
			wantOwnerId: "ttd",
			wantAppId:   "my-app",
		},
		{
			name:        "app id with multiple hyphens",
			input:       "ttd-my-cool-app",
			wantOwnerId: "ttd",
			wantAppId:   "my-cool-app",
		},
		{
			name:        "longer service owner id",
			input:       "digdir-some-app",
			wantOwnerId: "digdir",
			wantAppId:   "some-app",
		},
		{
			name:           "no hyphen",
			input:          "ttdapp",
			wantErr:        true,
			wantErrContain: "invalid MaskinportenClient resource name",
		},
		{
			name:           "empty string",
			input:          "",
			wantErr:        true,
			wantErrContain: "invalid MaskinportenClient resource name",
		},
		{
			name:           "only hyphen",
			input:          "-",
			wantErr:        true,
			wantErrContain: "invalid MaskinportenClient resource name",
		},
		{
			name:           "trailing hyphen",
			input:          "ttd-",
			wantErr:        true,
			wantErrContain: "invalid MaskinportenClient resource name",
		},
		{
			name:           "leading hyphen",
			input:          "-app",
			wantErr:        true,
			wantErrContain: "invalid MaskinportenClient resource name",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := NewWithT(t)

			result, err := ParseMaskinportenClientName(tt.input)

			if tt.wantErr {
				g.Expect(err).To(HaveOccurred())
				g.Expect(err.Error()).To(ContainSubstring(tt.wantErrContain))
				return
			}

			g.Expect(err).NotTo(HaveOccurred())
			g.Expect(result.ServiceOwnerId).To(Equal(tt.wantOwnerId))
			g.Expect(result.AppId).To(Equal(tt.wantAppId))
		})
	}
}
