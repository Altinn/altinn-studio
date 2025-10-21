package assert

import (
	"log"
	"runtime"
)

func Assert(condition bool) {
	if !condition {
		panicking("")
	}
}

func AssertWithMessage(condition bool, message string) {
	if !condition {
		panicking(message)
	}
}

//go:noinline
func panicking(message string) {
	buf := make([]byte, 1<<16)
	n := runtime.Stack(buf, false)

	if message != "" {
		log.Fatalf("Assertion failed: %s:\n%s", message, string(buf[:n]))
	} else {
		log.Fatalf("Assertion failed:\n%s", string(buf[:n]))
	}
}
