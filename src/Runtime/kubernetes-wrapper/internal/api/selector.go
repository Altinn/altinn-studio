package api

import (
	"fmt"
	"strings"
)

const (
	fieldSelectorMetadataName      = "metadata.name"
	fieldSelectorMetadataNamespace = "metadata.namespace"
)

type fieldPredicate struct {
	Key   string
	Value string
	Not   bool
}

type unsupportedFieldSelectorError struct {
	Field string
}

func (e unsupportedFieldSelectorError) Error() string {
	return fmt.Sprintf("unsupported fieldSelector key %q", e.Field)
}

type invalidFieldSelectorError struct {
	Message string
}

func (e invalidFieldSelectorError) Error() string {
	return e.Message
}

func parseFieldSelector(raw string) ([]fieldPredicate, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}

	parts := strings.Split(trimmed, ",")
	result := make([]fieldPredicate, 0, len(parts))

	for _, part := range parts {
		predicate, err := parseFieldSelectorPart(part)
		if err != nil {
			return nil, err
		}
		result = append(result, predicate)
	}

	return result, nil
}

func parseFieldSelectorPart(part string) (fieldPredicate, error) {
	trimmed := strings.TrimSpace(part)
	if trimmed == "" {
		return fieldPredicate{}, invalidFieldSelectorError{Message: "invalid empty fieldSelector term"}
	}

	operators := []string{"!=", "==", "="}
	for _, op := range operators {
		if index := strings.Index(trimmed, op); index >= 0 {
			key := strings.TrimSpace(trimmed[:index])
			value := strings.TrimSpace(trimmed[index+len(op):])
			if key == "" || value == "" {
				message := fmt.Sprintf("invalid fieldSelector term %q", trimmed)
				return fieldPredicate{}, invalidFieldSelectorError{Message: message}
			}

			if !isSupportedFieldSelectorKey(key) {
				return fieldPredicate{}, unsupportedFieldSelectorError{Field: key}
			}

			return fieldPredicate{Key: key, Value: value, Not: op == "!="}, nil
		}
	}

	message := fmt.Sprintf("invalid fieldSelector term %q", trimmed)
	return fieldPredicate{}, invalidFieldSelectorError{Message: message}
}

func isSupportedFieldSelectorKey(key string) bool {
	switch key {
	case fieldSelectorMetadataName, fieldSelectorMetadataNamespace:
		return true
	default:
		return false
	}
}

func matchesFieldSelector(predicates []fieldPredicate, values map[string]string) bool {
	for _, predicate := range predicates {
		currentValue := values[predicate.Key]
		if predicate.Not {
			if currentValue == predicate.Value {
				return false
			}
			continue
		}
		if currentValue != predicate.Value {
			return false
		}
	}
	return true
}
