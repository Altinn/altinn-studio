package random

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
)

var errLengthMustBePositive = errors.New("length must be positive")

func GenerateURLSafeString(length int) (string, error) {
	if length <= 0 {
		return "", fmt.Errorf("%w: %d", errLengthMustBePositive, length)
	}

	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}

	return base64.RawURLEncoding.EncodeToString(bytes)[:length], nil
}
