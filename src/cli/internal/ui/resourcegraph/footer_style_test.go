//nolint:testpackage // Same-package tests are justified here because the resourcegraph package is internal CLI implementation detail.
package resourcegraph

import (
	"testing"

	"altinn.studio/studioctl/internal/ui"
)

func TestReadyFooterStyle(t *testing.T) {
	tests := []struct {
		name       string
		want       ui.Style
		readyCount int
		totalCount int
	}{
		{name: "all ready is green", readyCount: 4, totalCount: 4, want: footerReadyStyle},
		{name: "none ready is red", readyCount: 0, totalCount: 4, want: footerFailedStyle},
		{name: "partial ready is orange", readyCount: 2, totalCount: 4, want: footerPartialStyle},
		{name: "empty graph is green", readyCount: 0, totalCount: 0, want: footerReadyStyle},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := readyFooterStyle(tt.readyCount, tt.totalCount); got != tt.want {
				t.Errorf("readyFooterStyle(%d, %d) = %+v, want %+v", tt.readyCount, tt.totalCount, got, tt.want)
			}
		})
	}
}

func TestFailedFooterStyle(t *testing.T) {
	if got := failedFooterStyle(0); got != footerLabelStyle {
		t.Errorf("failedFooterStyle(0) = %+v, want gray label style %+v", got, footerLabelStyle)
	}
	if got := failedFooterStyle(1); got != footerFailedStyle {
		t.Errorf("failedFooterStyle(1) = %+v, want red failed style %+v", got, footerFailedStyle)
	}
}
