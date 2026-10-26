package cmd

import (
	"strconv"
	"strings"

	"altinn.studio/studioctl/internal/osutil"
)

const bytesPerKilobyte = 1000

func joinLines(lines ...string) string {
	return strings.Join(lines, osutil.LineBreak) + osutil.LineBreak
}

// formatBytes renders a byte count with decimal (SI) units and one decimal, e.g. "1.2 GB".
func formatBytes(n int64) string {
	if n < bytesPerKilobyte {
		return strconv.FormatInt(n, 10) + " B"
	}
	value := float64(n) / bytesPerKilobyte
	units := []string{"kB", "MB", "GB", "TB", "PB"}
	unit := 0
	for value >= bytesPerKilobyte-0.05 && unit < len(units)-1 {
		value /= bytesPerKilobyte
		unit++
	}
	return strconv.FormatFloat(value, 'f', 1, 64) + " " + units[unit]
}
