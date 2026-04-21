package localtest

import (
	"fmt"
	"os"
	"runtime"
)

func newRuntimeConfig() RuntimeConfig {
	return RuntimeConfig{
		User: runtimeContainerUser(),
	}
}

func runtimeContainerUser() string {
	// Keep empty on Windows because os.Getuid/getgid are unsupported there.
	if runtime.GOOS == "windows" {
		return ""
	}
	return fmt.Sprintf("%d:%d", os.Getuid(), os.Getgid())
}
