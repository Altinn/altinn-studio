package maskinporten

import (
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"testing"
	"time"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/test/utils"
	"github.com/gkampitakis/go-snaps/snaps"
	"github.com/jonboulle/clockwork"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// Test constants
const (
	testClientId  = "test-client-id-123"
	testAuthority = "https://test.maskinporten.no"
	testAppId     = "testapp"
)

var (
	testScopes   = []string{"altinn:test/scope.read"}
	testCertSubj = crypto.CertSubject{
		Organization:       "Testdepartementet",
		OrganizationalUnit: "ttd",
		CommonName:         testAppId,
	}
)

// --- Test Dependencies ---

type fixture struct {
	crypto  *crypto.CryptoService
	clock   *clockwork.FakeClock
	config  *config.Config
	context *operatorcontext.Context
}

func newFixture() *fixture {
	ctx := operatorcontext.DiscoverOrDie(context.Background(), operatorcontext.EnvironmentLocal, nil)
	clock := clockwork.NewFakeClockAt(time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC))
	random := utils.NewDeterministicRand()
	cryptoService := crypto.NewDefaultService(clock, random)

	cfg := &config.Config{
		MaskinportenApi: config.MaskinportenApiConfig{
			AuthorityUrl: testAuthority,
		},
		Controller: config.ControllerConfig{
			JwkRotationThreshold: 23 * 24 * time.Hour, // 23 days
			JwkExpiry:            30 * 24 * time.Hour, // 30 days
		},
	}

	return &fixture{
		crypto:  cryptoService,
		clock:   clock,
		config:  cfg,
		context: ctx,
	}
}

func (d *fixture) getNotAfter() time.Time {
	return d.clock.Now().UTC().Add(time.Hour * 24 * 30)
}

// --- CRD Builder ---

type CrdOption func(*resourcesv1alpha1.MaskinportenClient)

func WithDeletionTimestamp(t time.Time) CrdOption {
	return func(c *resourcesv1alpha1.MaskinportenClient) {
		mt := metav1.NewTime(t)
		c.DeletionTimestamp = &mt
	}
}

func WithFinalizer() CrdOption {
	return func(c *resourcesv1alpha1.MaskinportenClient) {
		controllerutil.AddFinalizer(c, FinalizerName)
	}
}

func WithAnnotation(key, value string) CrdOption {
	return func(c *resourcesv1alpha1.MaskinportenClient) {
		if c.Annotations == nil {
			c.Annotations = make(map[string]string)
		}
		c.Annotations[key] = value
	}
}

func WithScopes(scopes []string) CrdOption {
	return func(c *resourcesv1alpha1.MaskinportenClient) {
		c.Spec.Scopes = scopes
	}
}

func createCrd(opts ...CrdOption) *resourcesv1alpha1.MaskinportenClient {
	crd := &resourcesv1alpha1.MaskinportenClient{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-" + testAppId,
			Namespace: "default",
		},
		Spec: resourcesv1alpha1.MaskinportenClientSpec{
			Scopes: testScopes,
		},
	}

	for _, opt := range opts {
		opt(crd)
	}

	return crd
}

// --- Secret Builder ---

func createSecret(name string) *corev1.Secret {
	f := false
	return &corev1.Secret{
		Immutable: &f,
		ObjectMeta: metav1.ObjectMeta{
			Name:      name + "-deployment-secrets",
			Namespace: "default",
		},
		Type: corev1.SecretTypeOpaque,
		Data: make(map[string][]byte),
	}
}

// --- Snapshot Types ---

type CommandSnapshot struct {
	Type      string   `json:"type"`
	ClientId  string   `json:"clientId,omitempty"`
	Scopes    []string `json:"scopes,omitempty"`
	Authority string   `json:"authority,omitempty"`
	KeyIds    []string `json:"keyIds,omitempty"`
}

type CommandListSnapshot []CommandSnapshot

func extractKeyIds(jwks *crypto.Jwks) []string {
	if jwks == nil {
		return nil
	}
	ids := make([]string, len(jwks.Keys))
	for i, k := range jwks.Keys {
		ids[i] = k.KeyID()
	}
	return ids
}

func toSnapshot(commands CommandList) CommandListSnapshot {
	result := make(CommandListSnapshot, len(commands))
	for i, cmd := range commands {
		snap := CommandSnapshot{Type: commandTypeName(cmd.Data)}

		switch c := cmd.Data.(type) {
		case *CreateClientInApiCommand:
			snap.Scopes = c.Api.Req.Scopes
			snap.KeyIds = extractKeyIds(c.Api.Jwks)
		case *UpdateClientInApiCommand:
			snap.ClientId = c.Api.ClientId
			if c.Api.Req != nil {
				snap.Scopes = c.Api.Req.Scopes
			}
			if c.Api.Jwks != nil {
				snap.KeyIds = extractKeyIds(c.Api.Jwks)
			}
		case *UpdateSecretContentCommand:
			snap.ClientId = c.SecretContent.ClientId
			snap.Authority = c.SecretContent.Authority
			snap.KeyIds = extractKeyIds(c.SecretContent.Jwks)
		case *DeleteClientInApiCommand:
			snap.ClientId = c.ClientId
		}
		result[i] = snap
	}
	return result
}

func commandTypeName(cmd any) string {
	return strings.TrimSuffix(reflect.TypeOf(cmd).Elem().Name(), "Command")
}

func toCompactSnapshotJSON(commands CommandList) string {
	snapshot := toSnapshot(commands)
	if len(snapshot) == 0 {
		return "[]"
	}
	lines := make([]string, len(snapshot))
	for i, cmd := range snapshot {
		b, _ := json.Marshal(cmd)
		lines[i] = " " + string(b)
	}
	return "[\n" + strings.Join(lines, ",\n") + "\n]"
}

// =============================================================================
// Lifecycle Scenario Tests
// =============================================================================

func TestReconcile_FreshCreate(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)

	state, err := NewClientState(crd, nil, nil, secret, nil)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_ApiExistsSecretLost(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, nil)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_ScopesChanged(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	newScopes := []string{"altinn:new/scope.write"}
	crd := createCrd(WithFinalizer(), WithScopes(newScopes))
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_AuthorityChanged(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: "https://old.authority.no",
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_ScopesAndAuthorityChanged(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	newScopes := []string{"altinn:new/scope.write"}
	crd := createCrd(WithFinalizer(), WithScopes(newScopes))
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: "https://old.authority.no",
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_ScopesAndJwksRotation(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	newScopes := []string{"altinn:new/scope.write"}
	crd := createCrd(WithFinalizer(), WithScopes(newScopes))
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Hour * 24 * 24)

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_AuthorityAndJwksRotation(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: "https://old.authority.no",
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Hour * 24 * 24)

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_Deletion(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(
		WithFinalizer(),
		WithDeletionTimestamp(deps.clock.Now()),
	)
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_DeletionApiAlreadyGone(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(
		WithFinalizer(),
		WithDeletionTimestamp(deps.clock.Now()),
	)
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, nil, nil, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_DeletionNoSecretContent(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(
		WithFinalizer(),
		WithDeletionTimestamp(deps.clock.Now()),
	)
	secret := createSecret("ttd-" + testAppId)

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId}, publicJwks, secret, nil)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_DeletionNoApiNoSecretContent(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	crd := createCrd(
		WithFinalizer(),
		WithDeletionTimestamp(deps.clock.Now()),
	)
	secret := createSecret("ttd-" + testAppId)

	state, err := NewClientState(crd, nil, nil, secret, nil)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestForcedRotation_IgnoredDuringDeletion(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(
		WithFinalizer(),
		WithDeletionTimestamp(deps.clock.Now()),
		WithAnnotation(AnnotationRotateJwk, "true"),
	)
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_NoChanges(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_ApiJwksMismatchSecret(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	secretJwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Second)
	apiJwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	apiPublicJwks, err := apiJwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      secretJwks,
		Jwk:       secretJwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, apiPublicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

// =============================================================================
// JWK Rotation Tests
// =============================================================================

func TestJwkRotation_NotNeededYet(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Hour * 24 * 10)

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestJwkRotation_TriggeredAtThreshold(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Hour * 24 * 24)

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestJwkRotation_SecondRotation(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Hour * 24 * 24)
	rotatedJwks, err := deps.crypto.RotateJwks(testCertSubj, deps.getNotAfter(), jwks)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(rotatedJwks).NotTo(BeNil())

	publicJwks, err := rotatedJwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      rotatedJwks,
		Jwk:       rotatedJwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	deps.clock.Advance(time.Hour * 24 * 25)

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

// =============================================================================
// Forced Rotation Tests
// =============================================================================

func TestForcedRotation_ViaAnnotation(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(
		WithFinalizer(),
		WithAnnotation(AnnotationRotateJwk, "true"),
	)
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestForcedRotation_AnnotationValueNotTrue(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(
		WithFinalizer(),
		WithAnnotation(AnnotationRotateJwk, "false"),
	)
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

// =============================================================================
// Edge Case / Error Tests
// =============================================================================

func TestNewClientState_MissingSecret(t *testing.T) {
	g := NewWithT(t)

	crd := createCrd()

	_, err := NewClientState(crd, nil, nil, nil, nil)
	g.Expect(err).To(HaveOccurred())

	var missingErr *MissingSecretError
	g.Expect(err).To(BeAssignableToTypeOf(missingErr))
}

func TestNewClientState_NilCrd(t *testing.T) {
	g := NewWithT(t)

	secret := createSecret("ttd-" + testAppId)

	_, err := NewClientState(nil, nil, nil, secret, nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("CRD"))
}

func TestNewClientState_MalformedCrdName(t *testing.T) {
	g := NewWithT(t)

	// Name without hyphen separator
	crd := &resourcesv1alpha1.MaskinportenClient{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "badname",
			Namespace: "default",
		},
	}
	secret := createSecret("badname")

	_, err := NewClientState(crd, nil, nil, secret, nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("invalid MaskinportenClient resource name"))
}

func TestNewClientState_EmptyClientIdFromApi(t *testing.T) {
	g := NewWithT(t)

	crd := createCrd()
	secret := createSecret("ttd-" + testAppId)

	// API response with empty ClientId
	_, err := NewClientState(crd, &ClientResponse{ClientId: ""}, nil, secret, nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("empty ClientId"))
}

func TestNewClientState_ApiJwksWithoutApi(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd()
	secret := createSecret("ttd-" + testAppId)

	// JWKS without API response is invalid
	_, err = NewClientState(crd, nil, jwks, secret, nil)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("api resource was not created but api JWKS was"))
}

func TestReconcile_EmptyScopes(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer(), WithScopes([]string{}))
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: []string{}}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_NilVsEmptyScopes(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	crd := createCrd(WithFinalizer())
	crd.Spec.Scopes = nil
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: testAuthority,
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: []string{}}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestNewClientState_NameWithMultipleHyphens(t *testing.T) {
	g := NewWithT(t)

	crd := &resourcesv1alpha1.MaskinportenClient{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "ttd-my-app",
			Namespace: "default",
		},
		Spec: resourcesv1alpha1.MaskinportenClientSpec{
			Scopes: testScopes,
		},
	}
	secret := createSecret("ttd-my-app")

	state, err := NewClientState(crd, nil, nil, secret, nil)
	g.Expect(err).NotTo(HaveOccurred())

	g.Expect(state.AppId).To(Equal("my-app"))
}

func TestReconcile_AddsFinalizer(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	// CRD without finalizer
	crd := createCrd()
	secret := createSecret("ttd-" + testAppId)

	state, err := NewClientState(crd, nil, nil, secret, nil)
	g.Expect(err).NotTo(HaveOccurred())

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}

func TestReconcile_AllChangesAtOnce(t *testing.T) {
	g := NewWithT(t)
	deps := newFixture()

	jwks, err := deps.crypto.CreateJwks(testCertSubj, deps.getNotAfter())
	g.Expect(err).NotTo(HaveOccurred())
	publicJwks, err := jwks.ToPublic()
	g.Expect(err).NotTo(HaveOccurred())

	newScopes := []string{"altinn:new/scope.write"}
	crd := createCrd(WithFinalizer(), WithScopes(newScopes))
	secret := createSecret("ttd-" + testAppId)
	secretContent := &SecretStateContent{
		ClientId:  testClientId,
		Authority: "https://old.authority.no",
		Jwks:      jwks,
		Jwk:       jwks.Keys[0],
	}

	state, err := NewClientState(crd, &ClientResponse{ClientId: testClientId, Scopes: testScopes}, publicJwks, secret, secretContent)
	g.Expect(err).NotTo(HaveOccurred())

	// Advance clock to trigger rotation
	deps.clock.Advance(time.Hour * 24 * 24)

	commands, err := state.Reconcile(deps.context, deps.config, deps.crypto, deps.clock)
	g.Expect(err).NotTo(HaveOccurred())

	snaps.MatchSnapshot(t, toCompactSnapshotJSON(commands))
}
