package e2e

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/gkampitakis/go-snaps/snaps"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/fakes"
	"altinn.studio/operator/test/utils"
)

// ConsistencyState tracks values that should remain consistent across test steps
type ConsistencyState struct {
	ClientID string   // Should not change once set (client not recreated)
	KeyIDs   []string // Should not change unless keys are rotated
}

var consistencyState *ConsistencyState

// ResetConsistencyState clears the tracked state (call in BeforeAll)
func ResetConsistencyState() {
	consistencyState = nil
}

// CaptureConsistency records initial values from the first successful reconciliation
func CaptureConsistency(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) {
	if consistencyState != nil || client == nil {
		return // Already captured or no client
	}
	if client.Status.ClientId == "" {
		return // Not yet reconciled
	}
	consistencyState = &ConsistencyState{
		ClientID: client.Status.ClientId,
		KeyIDs:   client.Status.KeyIds,
	}
}

// AssertConsistency verifies values haven't changed from the captured state
// Also verifies the Secret's maskinporten-settings.json matches the CR
func AssertConsistency(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) {
	if consistencyState == nil || client == nil {
		return // Nothing to verify
	}

	// Verify CR consistency across steps
	gomega.Expect(client.Status.ClientId).To(gomega.Equal(consistencyState.ClientID),
		"clientId changed unexpectedly - client may have been recreated")
	gomega.Expect(client.Status.KeyIds).To(gomega.Equal(consistencyState.KeyIDs),
		"keyIds changed unexpectedly - keys may have been rotated")

	// Verify Secret matches CR (cross-resource consistency)
	if secret != nil && secret.Data != nil {
		if settingsJSON, ok := secret.Data["maskinporten-settings.json"]; ok {
			var settings map[string]any
			if json.Unmarshal(settingsJSON, &settings) == nil {
				// Verify clientId matches
				if secretClientId, ok := settings["clientId"].(string); ok {
					gomega.Expect(secretClientId).To(gomega.Equal(consistencyState.ClientID),
						"Secret clientId doesn't match CR clientId")
				}
				// Verify key IDs in jwks match
				if jwks, ok := settings["jwks"].(map[string]any); ok {
					if keys, ok := jwks["keys"].([]any); ok {
						var secretKeyIds []string
						for _, key := range keys {
							if keyMap, ok := key.(map[string]any); ok {
								if kid, ok := keyMap["kid"].(string); ok {
									secretKeyIds = append(secretKeyIds, kid)
								}
							}
						}
						gomega.Expect(secretKeyIds).To(gomega.Equal(consistencyState.KeyIDs),
							"Secret keyIds don't match CR keyIds")
					}
				}
			}
		}
	}
}

// marshalJSONNoEscape marshals JSON without escaping HTML characters like < and >
func marshalJSONNoEscape(v any) ([]byte, error) {
	buf := &bytes.Buffer{}
	enc := json.NewEncoder(buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, err
	}
	// Remove trailing newline added by Encode
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}

const sanitizedTimestamp = "2024-01-01T00:00:00Z"
const sanitizedUID = "<sanitized-uid>"
const sanitizedResourceVersion = "<sanitized-resource-version>"

// SanitizeMetadata removes/replaces non-deterministic metadata fields
func SanitizeMetadata(meta map[string]any) {
	meta["uid"] = sanitizedUID
	meta["resourceVersion"] = sanitizedResourceVersion
	meta["creationTimestamp"] = sanitizedTimestamp
	delete(meta, "managedFields")

	// Sanitize ownerReferences UIDs
	if refs, ok := meta["ownerReferences"].([]any); ok {
		for _, ref := range refs {
			if refMap, ok := ref.(map[string]any); ok {
				refMap["uid"] = sanitizedUID
			}
		}
	}
}

const sanitizedClientId = "<sanitized-client-id>"

// SanitizeMaskinportenClientStatus sanitizes status timestamps and dynamic fields
func SanitizeMaskinportenClientStatus(status map[string]any) {
	if status["lastSynced"] != nil {
		status["lastSynced"] = sanitizedTimestamp
	}
	if status["clientId"] != nil {
		status["clientId"] = sanitizedClientId
	}
	if keyIds, ok := status["keyIds"].([]any); ok {
		for i := range keyIds {
			keyIds[i] = fmt.Sprintf("<key-id-%d>", i)
		}
	}
	if conditions, ok := status["conditions"].([]any); ok {
		for _, cond := range conditions {
			if condMap, ok := cond.(map[string]any); ok {
				SanitizeCondition(condMap)
			}
		}
	}
}

// SanitizeCondition sanitizes a metav1.Condition for deterministic snapshots
func SanitizeCondition(cond map[string]any) {
	if cond["lastTransitionTime"] != nil {
		cond["lastTransitionTime"] = sanitizedTimestamp
	}
	if msg, ok := cond["message"].(string); ok {
		cond["message"] = sanitizeConditionMessage(msg)
	}
}

// sanitizeConditionMessage replaces dynamic parts of condition messages (UUIDs, client IDs)
func sanitizeConditionMessage(msg string) string {
	// Replace UUIDs (e.g., "Client created with ID f75f4e9c-f896-413d-9291-8490bb10d7d5")
	uuidPattern := regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
	return uuidPattern.ReplaceAllString(msg, sanitizedClientId)
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
	// Replace RSA modulus (also varies per key generation)
	if keyMap["n"] != nil {
		keyMap["n"] = "<rsa-modulus>"
	}
}

// SanitizeSecretContent sanitizes the maskinporten-settings.json content
func SanitizeSecretContent(data map[string]any) {
	if data["clientId"] != nil {
		data["clientId"] = sanitizedClientId
	}
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
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal MaskinportenClient")

	var obj map[string]any
	err = json.Unmarshal(data, &obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to unmarshal MaskinportenClient")

	if meta, ok := obj["metadata"].(map[string]any); ok {
		SanitizeMetadata(meta)
	}
	if status, ok := obj["status"].(map[string]any); ok {
		SanitizeMaskinportenClientStatus(status)
	}

	sanitized, err := marshalJSONNoEscape(obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal sanitized MaskinportenClient")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(ginkgo.GinkgoT(), sanitized)
}

// SnapshotSecret takes a sanitized snapshot of a Secret with decoded data
func SnapshotSecret(secret *corev1.Secret, name string) {
	data, err := json.Marshal(secret)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal Secret")

	var obj map[string]any
	err = json.Unmarshal(data, &obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to unmarshal Secret")

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

	sanitized, err := marshalJSONNoEscape(obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal sanitized Secret")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(ginkgo.GinkgoT(), sanitized)
}

// SnapshotState takes sanitized snapshots of MaskinportenClient, Secret, and fakes db
// When client or secret is nil, it snapshots a placeholder indicating the resource doesn't exist
func SnapshotState(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret, db []fakes.ClientRecord, stepName string) {
	if client != nil {
		SnapshotMaskinportenClient(client, stepName+"-client")
	} else {
		snaps.WithConfig(snaps.Filename(stepName+"-client")).MatchJSON(ginkgo.GinkgoT(), []byte(`{"status": "does not exist"}`))
	}
	if secret != nil {
		SnapshotSecret(secret, stepName+"-secret")
	} else {
		snaps.WithConfig(snaps.Filename(stepName+"-secret")).MatchJSON(ginkgo.GinkgoT(), []byte(`{"status": "does not exist"}`))
	}
	SnapshotFakesDb(db, stepName+"-db")
}

// FetchStateFunc fetches the current state of a MaskinportenClient and its associated Secret
type FetchStateFunc func() (client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret, err error)

// ConditionFunc checks if the current state meets the expected condition
type ConditionFunc func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error

// FetchDbFunc fetches the fakes API dump
type FetchDbFunc func() ([]fakes.ClientRecord, error)

// EventuallyWithSnapshot polls a condition and snapshots the last state on completion (success or timeout)
func EventuallyWithSnapshot(
	fetchState FetchStateFunc,
	fetchDb FetchDbFunc,
	condition ConditionFunc,
	timeout time.Duration,
	interval time.Duration,
	snapshotName string,
) {
	var lastClient *resourcesv1alpha1.MaskinportenClient
	var lastSecret *corev1.Secret

	gomega.Eventually(func() error {
		client, secret, err := fetchState()
		if err != nil {
			return err
		}
		lastClient = client
		lastSecret = secret
		return condition(client, secret)
	}, timeout, interval).Should(gomega.Succeed())

	CaptureConsistency(lastClient, lastSecret)

	AssertConsistency(lastClient, lastSecret)

	var db []fakes.ClientRecord
	if fetchDb != nil {
		var err error
		db, err = fetchDb()
		gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to fetch fakes dump")
	}

	SnapshotState(lastClient, lastSecret, db, snapshotName)
}

// SanitizeClientResponse sanitizes a maskinporten ClientResponse for snapshots
func SanitizeClientResponse(client map[string]any, clientIndex int) {
	// Sanitize clientId (both camelCase and snake_case variants from JSON)
	if client["clientId"] != nil {
		client["clientId"] = fmt.Sprintf("<client-id-%d>", clientIndex)
	}
	if client["client_id"] != nil {
		client["client_id"] = fmt.Sprintf("<client-id-%d>", clientIndex)
	}

	// Sanitize timestamps (both camelCase and snake_case variants)
	if client["created"] != nil {
		client["created"] = sanitizedTimestamp
	}
	if client["lastUpdated"] != nil {
		client["lastUpdated"] = sanitizedTimestamp
	}
	if client["last_updated"] != nil {
		client["last_updated"] = sanitizedTimestamp
	}
}

// SanitizeFakesDb sanitizes the fakes db for deterministic snapshots
func SanitizeFakesDb(db []fakes.ClientRecord) any {
	if len(db) == 0 {
		return map[string]any{"status": "empty"}
	}

	var allRecords []map[string]any

	for i, record := range db {
		// Convert record to map for sanitization
		data, err := json.Marshal(record)
		if err != nil {
			continue
		}
		var recordMap map[string]any
		if err := json.Unmarshal(data, &recordMap); err != nil {
			continue
		}

		// Sanitize clientId at record level
		if recordMap["ClientId"] != nil {
			recordMap["ClientId"] = fmt.Sprintf("<client-id-%d>", i)
		}

		// Sanitize the Client field
		if clientData, ok := recordMap["Client"].(map[string]any); ok {
			SanitizeClientResponse(clientData, i)
		}

		// Sanitize JWKS
		if jwks, ok := recordMap["Jwks"].(map[string]any); ok {
			if keys, ok := jwks["keys"].([]any); ok {
				for j, key := range keys {
					if keyMap, ok := key.(map[string]any); ok {
						SanitizeJwk(keyMap, fmt.Sprintf("%d-%d", i, j))
					}
				}
			}
		}

		allRecords = append(allRecords, recordMap)
	}

	return map[string]any{
		"clients": allRecords,
	}
}

// SnapshotFakesDb takes a sanitized snapshot of the fakes API state
func SnapshotFakesDb(db []fakes.ClientRecord, name string) {
	sanitized := SanitizeFakesDb(db)

	data, err := marshalJSONNoEscape(sanitized)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal sanitized db")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(ginkgo.GinkgoT(), data)
}

// FetchFakesDb fetches the db from the fakes self-service API via Traefik ingress
func FetchFakesDb() ([]fakes.ClientRecord, error) {
	resp, err := http.Get("http://localhost:8020/fakes/test/dump")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch fakes db: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("fakes db returned status %d: %s", resp.StatusCode, string(body))
	}

	var db []fakes.ClientRecord
	if err := json.NewDecoder(resp.Body).Decode(&db); err != nil {
		return nil, fmt.Errorf("failed to decode fakes db: %w", err)
	}

	return db, nil
}

// ResetFakesState clears all state in the fakes server to ensure deterministic test runs
func ResetFakesState() error {
	resp, err := http.Post("http://localhost:8020/fakes/test/reset", "", nil)
	if err != nil {
		return fmt.Errorf("failed to reset fakes state: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("fakes reset returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// TokenResponse represents the response from the testapp /token endpoint
type TokenResponse struct {
	Success bool         `json:"success"`
	Claims  *TokenClaims `json:"claims,omitempty"`
	Error   string       `json:"error,omitempty"`
}

// TokenClaims represents the decoded token claims from the fake Maskinporten
type TokenClaims struct {
	Scopes   []string `json:"scopes"`
	ClientId string   `json:"client_id"`
}

// FetchToken calls the testapp token endpoint to generate a Maskinporten token
func FetchToken(scope string) (*TokenResponse, error) {
	tokenUrl := fmt.Sprintf("http://localhost:8020/ttd/localtestapp/token?scope=%s", url.QueryEscape(scope))
	resp, err := http.Get(tokenUrl)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token response: %w", err)
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w (body: %s)", err, string(body))
	}

	return &tokenResp, nil
}

// SanitizeTokenResponse sanitizes token claims for deterministic snapshots
func SanitizeTokenResponse(resp map[string]any) {
	if claims, ok := resp["claims"].(map[string]any); ok {
		if claims["client_id"] != nil {
			claims["client_id"] = sanitizedClientId
		}
	}
}

// SnapshotTokenResponse takes a sanitized snapshot of a token response
func SnapshotTokenResponse(resp *TokenResponse, name string) {
	data, err := json.Marshal(resp)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal TokenResponse")

	var obj map[string]any
	err = json.Unmarshal(data, &obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to unmarshal TokenResponse")

	SanitizeTokenResponse(obj)

	sanitized, err := marshalJSONNoEscape(obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal sanitized TokenResponse")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(ginkgo.GinkgoT(), sanitized)
}

// TriggerPodSecretSync patches pod annotations to force immediate secret volume sync.
// When a secret is updated, Kubernetes doesn't immediately sync the mounted volume.
// By patching a pod's annotation, we trigger the kubelet to reconcile the pod,
// which includes syncing the mounted secret volumes. This happens in <1 second
// instead of the default 60-90 second periodic sync.
// See: https://ahmet.im/blog/kubernetes-secret-volumes-delay/
func TriggerPodSecretSync(k8sClient *utils.K8sClient, namespace, appLabel string) error {
	ctx := context.Background()

	// Get pods matching the app label
	podList := &corev1.PodList{}
	err := k8sClient.Core.Get().
		Resource("pods").
		Namespace(namespace).
		Param("labelSelector", fmt.Sprintf("app=%s", appLabel)).
		Do(ctx).
		Into(podList)
	if err != nil {
		return fmt.Errorf("failed to list pods: %w", err)
	}

	if len(podList.Items) == 0 {
		return fmt.Errorf("no pods found with label app=%s in namespace %s", appLabel, namespace)
	}

	// Patch each pod's annotation to trigger resync
	timestamp := time.Now().Format(time.RFC3339Nano)
	patch := []byte(fmt.Sprintf(`{"metadata":{"annotations":{"altinn.studio/test-e2e-secret-sync":"%s"}}}`, timestamp))

	for _, pod := range podList.Items {
		err := k8sClient.Core.Patch(types.MergePatchType).
			Resource("pods").
			Namespace(namespace).
			Name(pod.Name).
			Body(patch).
			Do(ctx).
			Error()
		if err != nil {
			return fmt.Errorf("failed to patch pod %s: %w", pod.Name, err)
		}
	}

	return nil
}
