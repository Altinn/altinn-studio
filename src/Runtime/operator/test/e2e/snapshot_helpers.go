package e2e

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gkampitakis/go-snaps/snaps"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
)

const sanitizedTimestamp = "2024-01-01T00:00:00Z"
const sanitizedUID = "<sanitized-uid>"
const sanitizedResourceVersion = "<sanitized-resource-version>"

// SanitizeMetadata removes/replaces non-deterministic metadata fields
func SanitizeMetadata(meta map[string]any) {
	meta["uid"] = sanitizedUID
	meta["resourceVersion"] = sanitizedResourceVersion
	meta["creationTimestamp"] = sanitizedTimestamp
	delete(meta, "managedFields")

	if _, ok := meta["generation"]; ok {
		meta["generation"] = 1
	}

	// Sanitize ownerReferences UIDs
	if refs, ok := meta["ownerReferences"].([]any); ok {
		for _, ref := range refs {
			if refMap, ok := ref.(map[string]any); ok {
				refMap["uid"] = sanitizedUID
			}
		}
	}
}

// SanitizeMaskinportenClientStatus sanitizes status timestamps
func SanitizeMaskinportenClientStatus(status map[string]any) {
	if status["lastSynced"] != nil {
		status["lastSynced"] = sanitizedTimestamp
	}
}

// SanitizeJwk replaces non-deterministic JWK fields with placeholders
func SanitizeJwk(keyMap map[string]any, index string) {
	keyMap["kid"] = fmt.Sprintf("<key-id-%s>", index)
	if keyMap["x5c"] != nil {
		keyMap["x5c"] = []string{fmt.Sprintf("<certificate-%s>", index)}
	}
	// Replace private key fields with placeholders (shows they exist)
	for _, field := range []string{"d", "p", "q", "dp", "dq", "qi"} {
		if keyMap[field] != nil {
			keyMap[field] = "<private>"
		}
	}
}

// SanitizeSecretContent sanitizes the maskinporten-settings.json content
func SanitizeSecretContent(data map[string]any) {
	if jwks, ok := data["jwks"].(map[string]any); ok {
		if keys, ok := jwks["keys"].([]any); ok {
			for i, key := range keys {
				if keyMap, ok := key.(map[string]any); ok {
					SanitizeJwk(keyMap, fmt.Sprintf("%d", i))
				}
			}
		}
	}
	if data["jwk"] != nil {
		if jwk, ok := data["jwk"].(map[string]any); ok {
			SanitizeJwk(jwk, "active")
		}
	}
}

// SnapshotMaskinportenClient takes a sanitized snapshot of a MaskinportenClient
func SnapshotMaskinportenClient(client *resourcesv1alpha1.MaskinportenClient, name string) {
	// Convert to map for sanitization
	data, err := json.Marshal(client)
	Expect(err).NotTo(HaveOccurred(), "failed to marshal MaskinportenClient")

	var obj map[string]any
	err = json.Unmarshal(data, &obj)
	Expect(err).NotTo(HaveOccurred(), "failed to unmarshal MaskinportenClient")

	if meta, ok := obj["metadata"].(map[string]any); ok {
		SanitizeMetadata(meta)
	}
	if status, ok := obj["status"].(map[string]any); ok {
		SanitizeMaskinportenClientStatus(status)
	}

	sanitized, err := json.Marshal(obj)
	Expect(err).NotTo(HaveOccurred(), "failed to marshal sanitized MaskinportenClient")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(GinkgoT(), sanitized)
}

// SnapshotSecret takes a sanitized snapshot of a Secret with decoded data
func SnapshotSecret(secret *corev1.Secret, name string) {
	data, err := json.Marshal(secret)
	Expect(err).NotTo(HaveOccurred(), "failed to marshal Secret")

	var obj map[string]any
	err = json.Unmarshal(data, &obj)
	Expect(err).NotTo(HaveOccurred(), "failed to unmarshal Secret")

	if meta, ok := obj["metadata"].(map[string]any); ok {
		SanitizeMetadata(meta)
	}

	// Decode and sanitize the secret data for human-readable snapshots
	if dataField, ok := obj["data"].(map[string]any); ok {
		if settingsB64, ok := dataField["maskinporten-settings.json"].(string); ok {
			settingsBytes, err := base64.StdEncoding.DecodeString(settingsB64)
			if err == nil {
				var settings map[string]any
				if json.Unmarshal(settingsBytes, &settings) == nil {
					SanitizeSecretContent(settings)
					// Store decoded JSON directly (not base64) for readability
					dataField["maskinporten-settings.json"] = settings
				}
			}
		}
	}

	sanitized, err := json.Marshal(obj)
	Expect(err).NotTo(HaveOccurred(), "failed to marshal sanitized Secret")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(GinkgoT(), sanitized)
}

// SnapshotState takes sanitized snapshots of both MaskinportenClient and its associated Secret
func SnapshotState(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret, stepName string) {
	if client != nil {
		SnapshotMaskinportenClient(client, stepName+"-client")
	}
	if secret != nil {
		SnapshotSecret(secret, stepName+"-secret")
	}
}

// FetchStateFunc fetches the current state of a MaskinportenClient and its associated Secret
type FetchStateFunc func() (client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret, err error)

// ConditionFunc checks if the current state meets the expected condition
type ConditionFunc func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error

// EventuallyWithSnapshot polls a condition and snapshots the last state on completion (success or timeout)
func EventuallyWithSnapshot(
	fetchState FetchStateFunc,
	condition ConditionFunc,
	timeout time.Duration,
	interval time.Duration,
	snapshotName string,
) {
	var lastClient *resourcesv1alpha1.MaskinportenClient
	var lastSecret *corev1.Secret

	Eventually(func() error {
		client, secret, err := fetchState()
		if err != nil {
			return err
		}
		lastClient = client
		lastSecret = secret
		return condition(client, secret)
	}, timeout, interval).Should(Succeed())

	// Snapshot final state (whether success or timeout)
	SnapshotState(lastClient, lastSecret, snapshotName)
}
