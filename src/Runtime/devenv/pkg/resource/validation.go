package resource

import (
	"errors"
	"strings"
)

var errResourceNameRequired = errors.New("resource name is required")

func validateName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errResourceNameRequired
	}
	return nil
}
