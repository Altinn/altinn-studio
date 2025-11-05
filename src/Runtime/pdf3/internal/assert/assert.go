package assert

import (
	"fmt"
	"log/slog"
	"os"
	"runtime"

	"altinn.studio/pdf3/internal/log"
)

var logger *slog.Logger = log.NewComponent("assert")

func Assert(condition bool) {
	if !condition {
		panicking("")
	}
}

func AssertWithMessage(condition bool, message string, args ...any) {
	if !condition {
		panicking(message, args...)
	}
}

//go:noinline
func panicking(message string, userArgs ...any) {
	buf := make([]byte, 1<<16)
	n := runtime.Stack(buf, false)
	stackTrace := string(buf[:n])

	var args []any
	if message != "" {
		args = make([]any, 0, 2+len(userArgs))
		args = append(args, "message", message)
	} else {
		args = make([]any, 0, len(userArgs))
	}
	args = append(args, userArgs...)
	logger.Error("Assertion failed:", args...)
	_, _ = fmt.Fprintln(os.Stdout, stackTrace)
	os.Exit(1)
}
