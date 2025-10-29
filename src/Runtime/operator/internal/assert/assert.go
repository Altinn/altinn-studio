package assert

import (
	"fmt"
	"log"

	"github.com/go-errors/errors"
)

func Assert(ok bool) {
	if !ok {
		log.Fatalln(errors.New("assertion failed"))
	}
}

func AssertWith(ok bool, format string, a ...any) {
	if !ok {
		log.Fatalln(errors.Errorf("assertion failed: %s", fmt.Sprintf(format, a...)))
	}
}
