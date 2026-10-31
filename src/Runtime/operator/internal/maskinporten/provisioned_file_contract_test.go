package maskinporten_test

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	corev1 "k8s.io/api/core/v1"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"

	"altinn.studio/operator/internal/maskinporten"
)

// The provisioned Maskinporten file is a contract between three parties in three places: the operator writes it
// into the app's Secret, studioctl writes it for a local run, and the app libraries read it. The shared examples
// in src/common/provisioned-secrets-contract are what each party is tested against; see the README there.
const contractDir = "../../../../common/provisioned-secrets-contract"

// platformEnvFile is where a deployed app is told what its provisioned files are called.
const platformEnvFile = "../../../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml"

type provisionedSecretsContract struct {
	DirectoryVariable string `json:"directoryVariable"`
	Maskinporten      struct {
		FileNameVariable string                `json:"fileNameVariable"`
		FileName         string                `json:"fileName"`
		Section          string                `json:"section"`
		Examples         []maskinportenExample `json:"examples"`
	} `json:"maskinporten"`
}

type maskinportenExample struct {
	File      string `json:"file"`
	Writer    string `json:"writer"`
	Authority string `json:"authority"`
	ClientID  string `json:"clientId"`
	KeyID     string `json:"keyId"`
}

func readContract(t *testing.T) provisionedSecretsContract {
	t.Helper()
	data, err := os.ReadFile(filepath.Join(contractDir, "contract.json"))
	if err != nil {
		t.Fatalf("read contract: %v", err)
	}
	var contract provisionedSecretsContract
	if err := json.Unmarshal(data, &contract); err != nil {
		t.Fatalf("parse contract: %v", err)
	}
	return contract
}

func readJSON(t *testing.T, data []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatalf("parse JSON: %v", err)
	}
	return value
}

func TestProvisionedFileContract_FileName(t *testing.T) {
	contract := readContract(t)

	if maskinporten.JsonFileName != contract.Maskinporten.FileName {
		t.Fatalf(
			"the operator writes %q into the app's Secret, the contract says %q",
			maskinporten.JsonFileName,
			contract.Maskinporten.FileName,
		)
	}
}

// The operator writes the file under its own name, and the platform's configuration tells the app that name.
func TestProvisionedFileContract_PlatformTellsTheAppTheOperatorsFileName(t *testing.T) {
	contract := readContract(t)

	data, err := os.ReadFile(platformEnvFile)
	if err != nil {
		t.Fatalf("read the platform's app environment: %v", err)
	}
	var configMap corev1.ConfigMap
	if err := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096).Decode(&configMap); err != nil {
		t.Fatalf("parse the platform's app environment: %v", err)
	}
	if configMap.Kind != "ConfigMap" {
		t.Fatalf("expected the first document of %s to be the ConfigMap, got %q", platformEnvFile, configMap.Kind)
	}

	if got := configMap.Data[contract.Maskinporten.FileNameVariable]; got != maskinporten.JsonFileName {
		t.Fatalf(
			"the platform sets %s=%q, the operator writes %q",
			contract.Maskinporten.FileNameVariable,
			got,
			maskinporten.JsonFileName,
		)
	}
	if configMap.Data[contract.DirectoryVariable] == "" {
		t.Fatalf("the platform does not set %s", contract.DirectoryVariable)
	}
}

// The operator's example is what the operator writes: reading it and writing it again gives the same JSON, so a
// change to the operator's format fails here until the example, and the app libraries' test of it, follow.
func TestProvisionedFileContract_OperatorWritesItsExample(t *testing.T) {
	contract := readContract(t)

	examples := 0
	for _, example := range contract.Maskinporten.Examples {
		if example.Writer != "operator" {
			continue
		}
		examples++
		t.Run(example.File, func(t *testing.T) {
			assertOperatorWritesExample(t, contract, example)
		})
	}
	if examples == 0 {
		t.Fatal("the contract has no operator example")
	}
}

func assertOperatorWritesExample(t *testing.T, contract provisionedSecretsContract, example maskinportenExample) {
	t.Helper()
	golden, err := os.ReadFile(filepath.Join(contractDir, example.File))
	if err != nil {
		t.Fatalf("read example: %v", err)
	}

	var wrapper map[string]json.RawMessage
	if err = json.Unmarshal(golden, &wrapper); err != nil {
		t.Fatalf("parse example: %v", err)
	}
	if _, ok := wrapper[contract.Maskinporten.Section]; !ok || len(wrapper) != 1 {
		t.Fatalf("the example must hold exactly the %q object", contract.Maskinporten.Section)
	}

	content, err := maskinporten.DeserializeSecretStateContent(&corev1.Secret{
		Data: map[string][]byte{maskinporten.JsonFileName: golden},
	})
	if err != nil {
		t.Fatalf("deserialize example: %v", err)
	}
	if content == nil || content.Jwk == nil {
		t.Fatal("the example holds no client")
	}
	if content.ClientId != example.ClientID || content.Authority != example.Authority {
		t.Fatalf("read client %q at %q, the contract says %q at %q",
			content.ClientId, content.Authority, example.ClientID, example.Authority)
	}
	if content.Jwk.KeyID() != example.KeyID || content.Jwk.IsPublic() {
		t.Fatalf("read key %q (public: %v), the contract says private key %q",
			content.Jwk.KeyID(), content.Jwk.IsPublic(), example.KeyID)
	}

	secret := &corev1.Secret{}
	if err = content.SerializeTo(secret); err != nil {
		t.Fatalf("serialize: %v", err)
	}
	written, ok := secret.Data[contract.Maskinporten.FileName]
	if !ok {
		t.Fatalf("the operator wrote no %s", contract.Maskinporten.FileName)
	}
	if !reflect.DeepEqual(readJSON(t, written), readJSON(t, golden)) {
		t.Fatalf("the operator writes a different file than its example.\nwritten: %s\nexample: %s", written, golden)
	}
}
