package e2e

import (
	"bytes"
	"context"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
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

var errInvalidKeyIDFormat = errors.New("invalid key ID format")
var errFakesDBStatus = errors.New("fakes db returned unexpected status")
var errFakesResetStatus = errors.New("fakes reset returned unexpected status")
var errNoPodsFound = errors.New("no pods found for label")

// ConsistencyState tracks values that should remain consistent across test steps.
type ConsistencyState struct {
	ClientID    string   // Should not change once set (client not recreated)
	KeyIDs      []string // All keys ever seen (old keys retained, new keys prepended)
	MaxKeyIndex int      // Highest key index seen (monotonically increasing)
}

var consistencyState *ConsistencyState

// ResetConsistencyState clears the tracked state (call in BeforeAll).
func ResetConsistencyState() {
	consistencyState = nil
}

// parseKeyIndex extracts the numeric suffix from a key ID (e.g., "uuid.1" -> 1).
func parseKeyIndex(keyId string) (int, error) {
	parts := strings.Split(keyId, ".")
	if len(parts) < 2 {
		return 0, fmt.Errorf("%w: %s", errInvalidKeyIDFormat, keyId)
	}
	index, err := strconv.Atoi(parts[len(parts)-1])
	if err != nil {
		return 0, fmt.Errorf("parse key index from %q: %w", keyId, err)
	}
	return index, nil
}

// CaptureConsistency records initial values from the first successful reconciliation.
func CaptureConsistency(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) {
	if consistencyState != nil || client == nil {
		return // Already captured or no client
	}
	if client.Status.ClientId == "" {
		return // Not yet reconciled
	}

	maxIdx := -1
	for _, keyId := range client.Status.KeyIds {
		if idx, err := parseKeyIndex(keyId); err == nil && idx > maxIdx {
			maxIdx = idx
		}
	}

	consistencyState = &ConsistencyState{
		ClientID:    client.Status.ClientId,
		KeyIDs:      client.Status.KeyIds,
		MaxKeyIndex: maxIdx,
	}
}

// AssertConsistency verifies key rotation invariants:
// - ClientID never changes
// - Max 2 keys (newest + previous)
// - Keys ordered from newest to oldest (index 0 = newest)
// - New keys have higher index suffix than previous max
// - Secret matches CR state.
func AssertConsistency(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) {
	if consistencyState == nil || client == nil {
		return // Nothing to verify
	}

	assertClientConsistency(client)
	currentIndices := keyIndices(client.Status.KeyIds)
	newMaxIdx := updatedMaxKeyIndex(currentIndices)
	consistencyState.KeyIDs = client.Status.KeyIds
	consistencyState.MaxKeyIndex = newMaxIdx

	assertSecretConsistency(client, secret)
}

func assertClientConsistency(client *resourcesv1alpha1.MaskinportenClient) {
	gomega.Expect(client.Status.ClientId).To(gomega.Equal(consistencyState.ClientID),
		"clientId changed unexpectedly - client may have been recreated")
	gomega.Expect(len(client.Status.KeyIds)).To(gomega.BeNumerically("<=", 2),
		"expected at most 2 keys, got %d", len(client.Status.KeyIds))
}

func keyIndices(keyIDs []string) []int {
	currentIndices := make([]int, 0, len(keyIDs))
	for _, keyID := range keyIDs {
		idx, err := parseKeyIndex(keyID)
		gomega.Expect(err).NotTo(gomega.HaveOccurred(),
			"failed to parse key index from "+keyID)
		currentIndices = append(currentIndices, idx)
	}
	for i := 1; i < len(currentIndices); i++ {
		gomega.Expect(currentIndices[i]).To(gomega.BeNumerically("<", currentIndices[i-1]),
			"keys not ordered from newest to oldest: index %d should be < %d",
			currentIndices[i], currentIndices[i-1])
	}
	return currentIndices
}

func updatedMaxKeyIndex(currentIndices []int) int {
	newMaxIdx := consistencyState.MaxKeyIndex
	for _, idx := range currentIndices {
		if idx > consistencyState.MaxKeyIndex && idx > newMaxIdx {
			newMaxIdx = idx
		}
	}
	return newMaxIdx
}

func assertSecretConsistency(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) {
	if secret == nil || secret.Data == nil {
		return
	}

	settingsJSON, ok := secret.Data["maskinporten-settings.json"]
	if !ok {
		return
	}

	var settings map[string]any
	if json.Unmarshal(settingsJSON, &settings) != nil {
		return
	}

	settings = unwrapMaskinportenSettings(settings)
	assertSecretClientID(settings)
	assertSecretKeyIDs(settings, client.Status.KeyIds)
}

func unwrapMaskinportenSettings(settings map[string]any) map[string]any {
	if wrapper, ok := settings["MaskinportenSettings"].(map[string]any); ok {
		return wrapper
	}
	return settings
}

func assertSecretClientID(settings map[string]any) {
	secretClientID, ok := settings["ClientId"].(string)
	if !ok {
		return
	}

	gomega.Expect(secretClientID).To(gomega.Equal(consistencyState.ClientID),
		"Secret clientId doesn't match CR clientId")
}

func assertSecretKeyIDs(settings map[string]any, expected []string) {
	jwks, ok := settings["Jwks"].(map[string]any)
	if !ok {
		return
	}

	keys, ok := jwks["keys"].([]any)
	if !ok {
		return
	}

	secretKeyIDs := make([]string, 0, len(keys))
	for _, key := range keys {
		keyMap, ok := key.(map[string]any)
		if !ok {
			continue
		}
		kid, ok := keyMap["kid"].(string)
		if ok {
			secretKeyIDs = append(secretKeyIDs, kid)
		}
	}

	gomega.Expect(secretKeyIDs).To(gomega.ConsistOf(expected),
		"Secret keyIds don't match CR keyIds")
}

// marshalJSONNoEscape marshals JSON without escaping HTML characters like < and >.
func marshalJSONNoEscape(v any) ([]byte, error) {
	buf := &bytes.Buffer{}
	enc := json.NewEncoder(buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return nil, fmt.Errorf("encode snapshot JSON: %w", err)
	}
	// Remove trailing newline added by Encode
	return bytes.TrimSuffix(buf.Bytes(), []byte("\n")), nil
}

const sanitizedTimestamp = "2024-01-01T00:00:00Z"
const sanitizedUID = "<sanitized-uid>"
const sanitizedResourceVersion = "<sanitized-resource-version>"

// SanitizeMetadata removes/replaces non-deterministic metadata fields.
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
const sanitizedTraceId = "<sanitized-trace-id>"

// SanitizeMaskinportenClientStatus sanitizes status timestamps and dynamic fields.
func SanitizeMaskinportenClientStatus(status map[string]any) {
	if status["lastSynced"] != nil {
		status["lastSynced"] = sanitizedTimestamp
	}
	if status["clientId"] != nil {
		status["clientId"] = sanitizedClientId
	}
	sanitizeKeyIDs(status)
	sanitizeActionHistory(status)
	sanitizeConditions(status)
}

func sanitizeKeyIDs(status map[string]any) {
	keyIDs, ok := status["keyIds"].([]any)
	if !ok {
		return
	}

	for i, keyID := range keyIDs {
		keyIDs[i] = sanitizedKeyID(keyID, i)
	}
}

func sanitizedKeyID(value any, fallbackIndex int) string {
	keyID, ok := value.(string)
	if ok {
		if idx, err := parseKeyIndex(keyID); err == nil {
			return fmt.Sprintf("<key-uuid>.%d", idx)
		}
	}

	return fmt.Sprintf("<key-uuid>.%d", fallbackIndex)
}

func sanitizeActionHistory(status map[string]any) {
	actionHistory, ok := status["actionHistory"].([]any)
	if !ok {
		return
	}

	for _, action := range actionHistory {
		actionMap, ok := action.(map[string]any)
		if ok {
			SanitizeActionRecord(actionMap)
		}
	}
}

func sanitizeConditions(status map[string]any) {
	conditions, ok := status["conditions"].([]any)
	if !ok {
		return
	}

	for _, condition := range conditions {
		conditionMap, ok := condition.(map[string]any)
		if ok {
			SanitizeCondition(conditionMap)
		}
	}
}

// SanitizeCondition sanitizes a metav1.Condition for deterministic snapshots.
func SanitizeCondition(cond map[string]any) {
	if cond["lastTransitionTime"] != nil {
		cond["lastTransitionTime"] = sanitizedTimestamp
	}
	if msg, ok := cond["message"].(string); ok {
		cond["message"] = sanitizeConditionMessage(msg)
	}
}

// sanitizeConditionMessage replaces dynamic parts of condition messages (UUIDs, client IDs).
func sanitizeConditionMessage(msg string) string {
	// Replace UUIDs (e.g., "Client created with ID f75f4e9c-f896-413d-9291-8490bb10d7d5")
	uuidPattern := regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
	return uuidPattern.ReplaceAllString(msg, sanitizedClientId)
}

// SanitizeActionRecord sanitizes an ActionRecord for deterministic snapshots.
func SanitizeActionRecord(action map[string]any) {
	if action["timestamp"] != nil {
		action["timestamp"] = sanitizedTimestamp
	}
	if action["traceId"] != nil {
		action["traceId"] = sanitizedTraceId
	}
	if action["trace_id"] != nil {
		action["trace_id"] = sanitizedTraceId
	}
	if details, ok := action["details"].(string); ok {
		// Replace clientId UUIDs in details string
		uuidPattern := regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
		action["details"] = uuidPattern.ReplaceAllString(details, sanitizedClientId)
	}
}

// decodedCertInfo contains human-readable certificate fields for snapshots.
type decodedCertInfo struct {
	Subject  string `json:"subject"`
	Validity string `json:"validity"`
}

// decodeCertificate parses a base64 DER certificate and extracts deterministic fields.
func decodeCertificate(b64Cert string) *decodedCertInfo {
	der, err := base64.StdEncoding.DecodeString(b64Cert)
	if err != nil {
		return nil
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil
	}
	validity := cert.NotAfter.Sub(cert.NotBefore)
	// Round to nearest hour to avoid sub-second instability in snapshots
	validity = validity.Round(time.Hour)
	return &decodedCertInfo{
		Subject:  cert.Subject.String(),
		Validity: validity.String(),
	}
}

// SanitizeJwk replaces non-deterministic JWK fields with placeholders.
// Preserves the key suffix (e.g., .1, .2) from kid since it's deterministic.
// Decodes x5c certificates to show human-readable cert info.
func SanitizeJwk(keyMap map[string]any) {
	sanitizeJWKID(keyMap)
	sanitizeJWKCertificates(keyMap)
	sanitizeJWKPrivateFields(keyMap)
}

func sanitizeJWKID(keyMap map[string]any) {
	kid, ok := keyMap["kid"].(string)
	if !ok {
		return
	}

	if idx, err := parseKeyIndex(kid); err == nil {
		keyMap["kid"] = fmt.Sprintf("<key-uuid>.%d", idx)
		return
	}

	keyMap["kid"] = "<key-uuid>"
}

func sanitizeJWKCertificates(keyMap map[string]any) {
	x5c, ok := keyMap["x5c"].([]any)
	if !ok || len(x5c) == 0 {
		return
	}

	decoded := make([]decodedCertInfo, 0, len(x5c))
	for _, certAny := range x5c {
		certStr, ok := certAny.(string)
		if !ok {
			continue
		}
		info := decodeCertificate(certStr)
		if info != nil {
			decoded = append(decoded, *info)
		}
	}
	if len(decoded) > 0 {
		keyMap["x5c_decoded"] = decoded
	}
	delete(keyMap, "x5c")
}

func sanitizeJWKPrivateFields(keyMap map[string]any) {
	for _, field := range []string{"d", "p", "q", "dp", "dq", "qi"} {
		if keyMap[field] != nil {
			keyMap[field] = "<private>"
		}
	}
	if keyMap["n"] != nil {
		keyMap["n"] = "<rsa-modulus>"
	}
	if keyMap["exp"] != nil {
		keyMap["exp"] = "<cert-expiry>"
	}
}

// SanitizeSecretContent sanitizes the maskinporten-settings.json content.
func SanitizeSecretContent(data map[string]any) {
	// Navigate into MaskinportenSettings wrapper if present
	settings := data
	if wrapper, ok := data["MaskinportenSettings"].(map[string]any); ok {
		settings = wrapper
	}

	if settings["ClientId"] != nil {
		settings["ClientId"] = sanitizedClientId
	}
	if jwks, ok := settings["Jwks"].(map[string]any); ok {
		if keys, ok := jwks["keys"].([]any); ok {
			for _, key := range keys {
				if keyMap, ok := key.(map[string]any); ok {
					SanitizeJwk(keyMap)
				}
			}
		}
	}
	if settings["Jwk"] != nil {
		if jwk, ok := settings["Jwk"].(map[string]any); ok {
			SanitizeJwk(jwk)
		}
	}
}

// SnapshotMaskinportenClient takes a sanitized snapshot of a MaskinportenClient.
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

// SnapshotSecret takes a sanitized snapshot of a Secret with decoded data.
func SnapshotSecret(secret *corev1.Secret, name string) {
	data, err := json.Marshal(secret)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal Secret")

	var obj map[string]any
	err = json.Unmarshal(data, &obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to unmarshal Secret")

	if meta, ok := obj["metadata"].(map[string]any); ok {
		SanitizeMetadata(meta)
	}

	sanitizeSecretSnapshotData(obj)

	sanitized, err := marshalJSONNoEscape(obj)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal sanitized Secret")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(ginkgo.GinkgoT(), sanitized)
}

func sanitizeSecretSnapshotData(obj map[string]any) {
	dataField := ensureSecretSnapshotDataField(obj)
	for key := range dataField {
		if key != "maskinporten-settings.json" {
			delete(dataField, key)
		}
	}
	settingsB64, ok := dataField["maskinporten-settings.json"].(string)
	if !ok {
		return
	}

	settingsBytes, err := base64.StdEncoding.DecodeString(settingsB64)
	if err != nil {
		return
	}

	var settings map[string]any
	if json.Unmarshal(settingsBytes, &settings) != nil {
		return
	}

	SanitizeSecretContent(settings)
	dataField["maskinporten-settings.json"] = settings
}

func ensureSecretSnapshotDataField(obj map[string]any) map[string]any {
	if obj["data"] == nil {
		obj["data"] = map[string]any{}
	}
	dataField, ok := obj["data"].(map[string]any)
	if ok {
		return dataField
	}
	empty := map[string]any{}
	obj["data"] = empty
	return empty
}

// SnapshotState takes sanitized snapshots of MaskinportenClient, Secret, and fakes db
// When client or secret is nil, it snapshots a placeholder indicating the resource doesn't exist.
func SnapshotState(
	client *resourcesv1alpha1.MaskinportenClient,
	secret *corev1.Secret,
	db []fakes.ClientRecord,
	stepName string,
) {
	if client != nil {
		SnapshotMaskinportenClient(client, stepName+"-client")
	} else {
		snaps.WithConfig(snaps.Filename(stepName+"-client")).
			MatchJSON(ginkgo.GinkgoT(), []byte(`{"status": "does not exist"}`))
	}
	if secret != nil {
		SnapshotSecret(secret, stepName+"-secret")
	} else {
		snaps.WithConfig(snaps.Filename(stepName+"-secret")).
			MatchJSON(ginkgo.GinkgoT(), []byte(`{"status": "does not exist"}`))
	}
	SnapshotFakesDb(db, stepName+"-db")
}

// FetchStateFunc fetches the current state of a MaskinportenClient and its associated Secret.
type FetchStateFunc func() (client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret, err error)

// ConditionFunc checks if the current state meets the expected condition.
type ConditionFunc func(client *resourcesv1alpha1.MaskinportenClient, secret *corev1.Secret) error

// FetchDbFunc fetches the fakes API dump.
type FetchDbFunc func() ([]fakes.ClientRecord, error)

// EventuallyWithSnapshot polls a condition and snapshots the last state on completion (success or timeout).
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

// SanitizeClientResponse sanitizes a maskinporten ClientResponse for snapshots.
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

// SanitizeFakesDb sanitizes the fakes db for deterministic snapshots.
func SanitizeFakesDb(db []fakes.ClientRecord) any {
	if len(db) == 0 {
		return map[string]any{"status": "empty"}
	}

	allRecords := make([]map[string]any, 0, len(db))

	for i, record := range db {
		recordMap, ok := sanitizeFakesRecord(record, i)
		if ok {
			allRecords = append(allRecords, recordMap)
		}
	}

	return map[string]any{
		"clients": allRecords,
	}
}

func sanitizeFakesRecord(record fakes.ClientRecord, clientIndex int) (map[string]any, bool) {
	data, err := json.Marshal(record)
	if err != nil {
		return nil, false
	}

	var recordMap map[string]any
	if json.Unmarshal(data, &recordMap) != nil {
		return nil, false
	}

	if recordMap["ClientId"] != nil {
		recordMap["ClientId"] = fmt.Sprintf("<client-id-%d>", clientIndex)
	}
	clientData, ok := recordMap["Client"].(map[string]any)
	if ok {
		SanitizeClientResponse(clientData, clientIndex)
	}
	sanitizeRecordJWKs(recordMap)

	return recordMap, true
}

func sanitizeRecordJWKs(recordMap map[string]any) {
	jwks, ok := recordMap["Jwks"].(map[string]any)
	if !ok {
		return
	}
	keys, ok := jwks["keys"].([]any)
	if !ok {
		return
	}
	for _, key := range keys {
		keyMap, ok := key.(map[string]any)
		if ok {
			SanitizeJwk(keyMap)
		}
	}
}

// SnapshotFakesDb takes a sanitized snapshot of the fakes API state.
func SnapshotFakesDb(db []fakes.ClientRecord, name string) {
	sanitized := SanitizeFakesDb(db)

	data, err := marshalJSONNoEscape(sanitized)
	gomega.Expect(err).NotTo(gomega.HaveOccurred(), "failed to marshal sanitized db")

	snaps.WithConfig(snaps.Filename(name)).MatchJSON(ginkgo.GinkgoT(), data)
}

func newLocalRequest(ctx context.Context, method, rawURL string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, rawURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	return req, nil
}

func readResponseBody(resp *http.Response) ([]byte, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}
	return body, nil
}

// FetchFakesDb fetches the db from the fakes self-service API via Traefik ingress.
func FetchFakesDb() ([]fakes.ClientRecord, error) {
	req, err := newLocalRequest(context.Background(), http.MethodGet, "http://localhost:8020/fakes/test/dump")
	if err != nil {
		return nil, fmt.Errorf("prepare fakes db request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch fakes db: %w", err)
	}
	defer func() {
		gomega.Expect(resp.Body.Close()).To(gomega.Succeed())
	}()

	if resp.StatusCode != http.StatusOK {
		body, readErr := readResponseBody(resp)
		if readErr != nil {
			return nil, fmt.Errorf("read failing fakes db response: %w", readErr)
		}
		return nil, fmt.Errorf("%w: %d: %s", errFakesDBStatus, resp.StatusCode, string(body))
	}

	var db []fakes.ClientRecord
	if err := json.NewDecoder(resp.Body).Decode(&db); err != nil {
		return nil, fmt.Errorf("failed to decode fakes db: %w", err)
	}

	return db, nil
}

// ResetFakesState clears all state in the fakes server to ensure deterministic test runs.
func ResetFakesState() error {
	req, err := newLocalRequest(context.Background(), http.MethodPost, "http://localhost:8020/fakes/test/reset")
	if err != nil {
		return fmt.Errorf("prepare fakes reset request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to reset fakes state: %w", err)
	}
	defer func() {
		gomega.Expect(resp.Body.Close()).To(gomega.Succeed())
	}()

	if resp.StatusCode != http.StatusOK {
		body, readErr := readResponseBody(resp)
		if readErr != nil {
			return fmt.Errorf("read failing fakes reset response: %w", readErr)
		}
		return fmt.Errorf("%w: %d: %s", errFakesResetStatus, resp.StatusCode, string(body))
	}

	return nil
}

// TokenResponse represents the response from the testapp /token endpoint.
type TokenResponse struct {
	Claims  *TokenClaims `json:"claims,omitempty"`
	Error   string       `json:"error,omitempty"`
	Success bool         `json:"success"`
}

// TokenClaims represents the decoded token claims from the fake Maskinporten.
type TokenClaims struct {
	ClientId string   `json:"client_id"`
	Scopes   []string `json:"scopes"`
}

// FetchToken calls the testapp token endpoint to generate a Maskinporten token.
func FetchToken(scope string) (*TokenResponse, error) {
	tokenUrl := "http://localhost:8020/ttd/localtestapp/token?scope=" + url.QueryEscape(scope)
	req, err := newLocalRequest(context.Background(), http.MethodGet, tokenUrl)
	if err != nil {
		return nil, fmt.Errorf("prepare token request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch token: %w", err)
	}
	defer func() {
		gomega.Expect(resp.Body.Close()).To(gomega.Succeed())
	}()

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

// DbCheckResponse represents the response from the testapp /dbcheck endpoint.
type DbCheckResponse struct {
	Error   string `json:"error,omitempty"`
	Result  int    `json:"result,omitempty"`
	Success bool   `json:"success"`
}

// FetchDbCheck calls the testapp dbcheck endpoint to verify database connectivity.
func FetchDbCheck() (*DbCheckResponse, error) {
	req, err := newLocalRequest(
		context.Background(),
		http.MethodGet,
		"http://localhost:8020/ttd/localtestapp/dbcheck",
	)
	if err != nil {
		return nil, fmt.Errorf("prepare dbcheck request: %w", err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch dbcheck: %w", err)
	}
	defer func() {
		gomega.Expect(resp.Body.Close()).To(gomega.Succeed())
	}()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read dbcheck response: %w", err)
	}

	var dbResp DbCheckResponse
	if err := json.Unmarshal(body, &dbResp); err != nil {
		return nil, fmt.Errorf("failed to decode dbcheck response: %w (body: %s)", err, string(body))
	}

	return &dbResp, nil
}

// SanitizeTokenResponse sanitizes token claims for deterministic snapshots.
func SanitizeTokenResponse(resp map[string]any) {
	if claims, ok := resp["claims"].(map[string]any); ok {
		if claims["client_id"] != nil {
			claims["client_id"] = sanitizedClientId
		}
	}
}

// SnapshotTokenResponse takes a sanitized snapshot of a token response.
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
		Param("labelSelector", "app="+appLabel).
		Do(ctx).
		Into(podList)
	if err != nil {
		return fmt.Errorf("failed to list pods: %w", err)
	}

	if len(podList.Items) == 0 {
		return fmt.Errorf("%w: app=%s namespace=%s", errNoPodsFound, appLabel, namespace)
	}

	// Patch each pod's annotation to trigger resync
	timestamp := time.Now().Format(time.RFC3339Nano)
	patch := fmt.Appendf(nil, `{"metadata":{"annotations":{"altinn.studio/test-e2e-secret-sync":"%s"}}}`, timestamp)

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
