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
	_, filePath, lineNumber, ok := runtime.Caller(2)
	if ok {
		if message != "" {
			log.Fatalf("Assertion failed at %s:%d: %s", filePath, lineNumber, message)
		} else {
			log.Fatalf("Assertion failed at %s:%d", filePath, lineNumber)
		}
	} else {
		if message != "" {
			log.Fatalf("Assertion failed at unkonwn location: %s", message)
		} else {
			log.Fatalln("Assertion failed at unknown loation")
		}
	}
}
