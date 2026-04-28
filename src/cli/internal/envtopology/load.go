package envtopology

import (
	"bytes"
	_ "embed"
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

const supportedVersion = 1

var (
	//go:embed topology.yaml
	embeddedTopology []byte
)

func defaultDefinition() definition {
	def, err := parseDefinitionYAML(embeddedTopology)
	if err != nil {
		panic("envtopology: load embedded topology: " + err.Error())
	}
	return def
}

func parseDefinitionYAML(data []byte) (definition, error) {
	decoder := yaml.NewDecoder(bytes.NewReader(data))
	decoder.KnownFields(true)

	var def definition
	if err := decoder.Decode(&def); err != nil {
		return definition{}, fmt.Errorf("decode topology yaml: %w", err)
	}

	if err := validateDefinition(def); err != nil {
		return definition{}, err
	}

	return def, nil
}

func trimSchemeSeparator(scheme string) string {
	return strings.TrimSuffix(scheme, "://")
}
