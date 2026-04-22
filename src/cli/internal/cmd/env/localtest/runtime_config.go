package localtest

import (
	"fmt"
	"os"
	"runtime"
)

const osWindows = "windows"

func newRuntimeConfig() RuntimeConfig {
	return RuntimeConfig{
		User: runtimeContainerUser(),
	}
}

func runtimeContainerUser() string {
	// Keep empty on Windows because os.Getuid/getgid are unsupported there.
	if runtime.GOOS == osWindows {
		return ""
	}
	return fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
}
