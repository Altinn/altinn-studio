//go:build windows

package osutil

import (
	"fmt"
	"io"
	"os"
)

const terminalInputPath = "CONIN$"

// OpenTerminalInput opens the console for interactive input.
func OpenTerminalInput() (io.Reader, func() error, error) {
	f, err := os.OpenFile(terminalInputPath, os.O_RDONLY, 0)
	if err != nil {
		return nil, nil, fmt.Errorf("open terminal input: %w", err)
	}

	return f, f.Close, nil
}
