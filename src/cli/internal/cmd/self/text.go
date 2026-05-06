package self

import (
	"strings"

	"altinn.studio/studioctl/internal/osutil"
)

func joinLines(lines ...string) string {
	return strings.Join(lines, osutil.LineBreak) + osutil.LineBreak
}
