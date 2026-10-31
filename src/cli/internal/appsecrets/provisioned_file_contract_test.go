package appsecrets_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"altinn.studio/studioctl/internal/appsecrets"
)

// The provisioned Maskinporten file is a contract between three parties in three places: the operator writes it
// into the app's Secret, studioctl writes it for a local run, and the app libraries read it. The shared examples
// in src/common/provisioned-secrets-contract are what each party is tested against; see the README there.
const contractDir = "../../../common/provisioned-secrets-contract"

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

// studioctl tells the app where its secrets are with the variables and the file name the platform uses.
func TestProvisionedFileContract_Names(t *testing.T) {
	t.Parallel()
	contract := readContract(t)

	if appsecrets.EnvSecretsDir != contract.DirectoryVariable {
		t.Errorf("studioctl sets %q, the contract says %q", appsecrets.EnvSecretsDir, contract.DirectoryVariable)
	}
	if appsecrets.EnvMaskinportenFileName != contract.Maskinporten.FileNameVariable {
		t.Errorf(
			"studioctl sets %q, the contract says %q",
			appsecrets.EnvMaskinportenFileName,
			contract.Maskinporten.FileNameVariable,
		)
	}
	if appsecrets.MaskinportenFileName != contract.Maskinporten.FileName {
		t.Errorf(
			"studioctl writes and advertises %q, the contract says %q",
			appsecrets.MaskinportenFileName,
			contract.Maskinporten.FileName,
		)
	}
}

// studioctl's examples are what studioctl writes: storing the client read from one writes the same JSON, so a
// change to studioctl's format fails here until the example, and the app libraries' test of it, follow.
func TestProvisionedFileContract_StudioctlWritesItsExamples(t *testing.T) {
	t.Parallel()
	contract := readContract(t)

	examples := 0
	for _, example := range contract.Maskinporten.Examples {
		if example.Writer != "studioctl" {
			continue
		}
		examples++
		t.Run(example.File, func(t *testing.T) {
			t.Parallel()
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

			client, err := appsecrets.ParseMaskinportenClient(golden)
			if err != nil {
				t.Fatalf("parse example: %v", err)
			}
			summary := client.Summary()
			if summary.ClientID != example.ClientID || summary.Authority != example.Authority ||
				summary.KeyID != example.KeyID {
				t.Fatalf("read %+v, the contract says client %q at %q with key %q",
					summary, example.ClientID, example.Authority, example.KeyID)
			}

			dir := t.TempDir()
			path, err := appsecrets.StoreMaskinportenClient(dir, client)
			if err != nil {
				t.Fatalf("store: %v", err)
			}
			if filepath.Base(path) != contract.Maskinporten.FileName {
				t.Fatalf(
					"studioctl wrote %s, the contract says %s",
					filepath.Base(path),
					contract.Maskinporten.FileName,
				)
			}
			written, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read the written file: %v", err)
			}
			if !reflect.DeepEqual(readJSON(t, written), readJSON(t, golden)) {
				t.Fatalf(
					"studioctl writes a different file than its example.\nwritten: %s\nexample: %s",
					written,
					golden,
				)
			}
		})
	}
	if examples == 0 {
		t.Fatal("the contract has no studioctl example")
	}
}
