package assert

import (
	"fmt"
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
	_, filePath, lineNumber, ok := runtime.Caller(1)
	if ok {
		if message != "" {
			p := fmt.Sprintf("Assertion failed at %s:%d: %s", filePath, lineNumber, message)
			panic(p)
		} else {
			p := fmt.Sprintf("Assertion failed at %s:%d", filePath, lineNumber)
			panic(p)
		}
	} else {
		if message != "" {
			p := fmt.Sprintf("Assertion failed at unkonwn location: %s", message)
			panic(p)
		} else {
			panic("Assertion failed at unkonwn location")
		}
	}
}
