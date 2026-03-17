// Package docker provides utilities for Docker/container runtime operations.
package docker

// Docker multiplexed log format constants.
// Docker logs use an 8-byte header when streaming: [stream_type(1)][0(3)][size(4)][payload].
// stream_type values: 1 = stdout, 2 = stderr.
const (
	multiplexHeaderSize = 8
	streamTypeStdout    = 1
	streamTypeStderr    = 2
)

// StripMultiplexedHeader removes the 8-byte Docker multiplexed log header if present.
// Docker logs have format: [stream_type(1)][0(3)][size(4)][payload]
// where stream_type is 1 for stdout or 2 for stderr.
// Returns the original string if no header is detected.
func StripMultiplexedHeader(line string) string {
	if len(line) < multiplexHeaderSize {
		return line
	}

	firstByte := line[0]
	if firstByte != streamTypeStdout && firstByte != streamTypeStderr {
		return line
	}
	if line[1] != 0 || line[2] != 0 || line[3] != 0 {
		return line
	}

	return line[multiplexHeaderSize:]
}
