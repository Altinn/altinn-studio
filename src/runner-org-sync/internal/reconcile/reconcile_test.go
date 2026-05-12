package reconcile

import (
	"context"
	"errors"
	"sort"
	"strings"
	"testing"

	"altinn.studio/runner-org-sync/internal/cdn"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// --- stub dependencies ------------------------------------------------------

type stubSource struct {
	orgs []cdn.Org
	err  error
}

func (s *stubSource) Fetch(_ context.Context) ([]cdn.Org, error) { return s.orgs, s.err }

type stubMinter struct {
	// per-org overrides: token to return or error to raise.
	tokens map[string]string
	errs   map[string]error
	calls  []string
}

func (m *stubMinter) MintRegistrationToken(_ context.Context, org string) (string, error) {
	m.calls = append(m.calls, org)
	if err, ok := m.errs[org]; ok {
		return "", err
	}
	if t, ok := m.tokens[org]; ok {
		return t, nil
	}
	return "tok-" + org, nil
}

type stubStore struct {
	managed         []corev1.Secret
	existsByName    map[string]bool
	createErr       map[string]error
	deleteErr       map[string]error
	applyCMErr      error
	listErr         error
	existsErr       error
	createdSecrets  []string
	createdOrgs     map[string]string
	deletedSecrets  []string
	appliedCMData   map[string]string
	appliedCMChange bool
}

func newStubStore() *stubStore {
	return &stubStore{
		existsByName:    map[string]bool{},
		createErr:       map[string]error{},
		deleteErr:       map[string]error{},
		createdOrgs:     map[string]string{},
		appliedCMChange: true,
	}
}

func (s *stubStore) ListManagedSecrets(_ context.Context) ([]corev1.Secret, error) {
	return s.managed, s.listErr
}

func (s *stubStore) SecretExists(_ context.Context, name string) (bool, error) {
	if s.existsErr != nil {
		return false, s.existsErr
	}
	return s.existsByName[name], nil
}

func (s *stubStore) CreateRegistrationSecret(_ context.Context, name, org, _ string) error {
	if err, ok := s.createErr[name]; ok {
		return err
	}
	s.createdSecrets = append(s.createdSecrets, name)
	s.createdOrgs[name] = org
	s.existsByName[name] = true
	return nil
}

func (s *stubStore) DeleteSecret(_ context.Context, name string) error {
	if err, ok := s.deleteErr[name]; ok {
		return err
	}
	s.deletedSecrets = append(s.deletedSecrets, name)
	return nil
}

func (s *stubStore) ApplyConfigMap(_ context.Context, _ string, data map[string]string) (bool, error) {
	if s.applyCMErr != nil {
		return false, s.applyCMErr
	}
	s.appliedCMData = data
	return s.appliedCMChange, nil
}

// --- helpers ----------------------------------------------------------------

func secretNameFor(org string) string { return "altinn-gitea-runner-" + org + "-secret" }

func managedSecret(name, org string) corev1.Secret {
	return corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			Labels: map[string]string{
				"runner-org-sync.altinn.studio/org": org,
				"app.kubernetes.io/managed-by":      "runner-org-sync",
			},
		},
	}
}

func runReconciler(t *testing.T, src *stubSource, minter *stubMinter, store *stubStore, whitelist []string, syncAll bool) Report {
	t.Helper()
	r, err := New(Options{
		Source:        src,
		Minter:        minter,
		Store:         store,
		SecretNameFor: secretNameFor,
		ConfigMapName: "runner-org-list",
		Whitelist:     whitelist,
		SyncAll:       syncAll,
	})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	rep, err := r.Run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	return rep
}

// --- scenarios from the design ----------------------------------------------

// Scenario 1: cold start, three orgs, all desired, no existing Secrets.
func TestRun_ColdStart(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02", "production"}},
		{Code: "brg", Environments: []string{"production"}},
		{Code: "dsb", Environments: []string{"tt02"}},
	}}
	minter := &stubMinter{}
	store := newStubStore()

	rep := runReconciler(t, src, minter, store, []string{"ttd", "brg", "dsb"}, false)

	if rep.Outcome != OutcomeSuccess {
		t.Errorf("outcome = %v, want success", rep.Outcome)
	}
	wantCreated := []string{"brg", "dsb", "ttd"}
	if !equalSlice(rep.SecretsCreated, wantCreated) {
		t.Errorf("SecretsCreated = %v, want %v", rep.SecretsCreated, wantCreated)
	}
	if !equalSlice(minter.calls, wantCreated) {
		t.Errorf("minter calls = %v, want %v (sorted)", minter.calls, wantCreated)
	}
	if !rep.ConfigMapChanged {
		t.Errorf("ConfigMapChanged = false, want true on cold start")
	}
	wantBody := strings.Join([]string{
		"- name: brg",
		"  replicas: 1",
		"  registrationTokenSecretName: altinn-gitea-runner-brg-secret",
		"- name: dsb",
		"  replicas: 1",
		"  registrationTokenSecretName: altinn-gitea-runner-dsb-secret",
		"- name: ttd",
		"  replicas: 1",
		"  registrationTokenSecretName: altinn-gitea-runner-ttd-secret",
		"",
	}, "\n")
	if got := store.appliedCMData[ConfigMapDataKey]; got != wantBody {
		t.Errorf("ConfigMap body =\n%q\nwant\n%q", got, wantBody)
	}
}

// Scenario 2: re-run with no upstream change → no Secret writes, no mint calls.
func TestRun_IdempotentReRun(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		{Code: "brg", Environments: []string{"production"}},
	}}
	minter := &stubMinter{}
	store := newStubStore()
	// pre-populate existing state — secrets exist for both orgs and we own them.
	store.existsByName["altinn-gitea-runner-ttd-secret"] = true
	store.existsByName["altinn-gitea-runner-brg-secret"] = true
	store.managed = []corev1.Secret{
		managedSecret("altinn-gitea-runner-ttd-secret", "ttd"),
		managedSecret("altinn-gitea-runner-brg-secret", "brg"),
	}

	rep := runReconciler(t, src, minter, store, []string{"ttd", "brg"}, false)

	if rep.Outcome != OutcomeSuccess {
		t.Errorf("outcome = %v, want success", rep.Outcome)
	}
	if len(minter.calls) != 0 {
		t.Errorf("minter should not be called on idempotent re-run; got %v", minter.calls)
	}
	if len(store.createdSecrets) != 0 {
		t.Errorf("no creates expected; got %v", store.createdSecrets)
	}
	if len(store.deletedSecrets) != 0 {
		t.Errorf("no deletes expected; got %v", store.deletedSecrets)
	}
	wantSkipped := []string{"brg", "ttd"}
	if !equalSlice(rep.SecretsSkipped, wantSkipped) {
		t.Errorf("SecretsSkipped = %v, want %v", rep.SecretsSkipped, wantSkipped)
	}
}

// Scenario 3: org added to desired set → exactly one mint + create.
func TestRun_OrgAdded(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		{Code: "brg", Environments: []string{"production"}},
		{Code: "dsb", Environments: []string{"production"}}, // new
	}}
	minter := &stubMinter{}
	store := newStubStore()
	store.existsByName["altinn-gitea-runner-ttd-secret"] = true
	store.existsByName["altinn-gitea-runner-brg-secret"] = true
	store.managed = []corev1.Secret{
		managedSecret("altinn-gitea-runner-ttd-secret", "ttd"),
		managedSecret("altinn-gitea-runner-brg-secret", "brg"),
	}

	rep := runReconciler(t, src, minter, store, []string{"ttd", "brg", "dsb"}, false)

	if rep.Outcome != OutcomeSuccess {
		t.Errorf("outcome = %v, want success", rep.Outcome)
	}
	if !equalSlice(minter.calls, []string{"dsb"}) {
		t.Errorf("minter calls = %v, want [dsb]", minter.calls)
	}
	if !equalSlice(rep.SecretsCreated, []string{"dsb"}) {
		t.Errorf("SecretsCreated = %v, want [dsb]", rep.SecretsCreated)
	}
}

// Scenario 4: org removed from CDN → its Secret is deleted, ConfigMap reflects.
func TestRun_OrgRemoved(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		// brg is gone from CDN
	}}
	minter := &stubMinter{}
	store := newStubStore()
	store.existsByName["altinn-gitea-runner-ttd-secret"] = true
	store.existsByName["altinn-gitea-runner-brg-secret"] = true
	store.managed = []corev1.Secret{
		managedSecret("altinn-gitea-runner-ttd-secret", "ttd"),
		managedSecret("altinn-gitea-runner-brg-secret", "brg"),
	}

	rep := runReconciler(t, src, minter, store, []string{"ttd", "brg"}, false)

	if rep.Outcome != OutcomeSuccess {
		t.Errorf("outcome = %v, want success", rep.Outcome)
	}
	if !equalSlice(store.deletedSecrets, []string{"altinn-gitea-runner-brg-secret"}) {
		t.Errorf("deletedSecrets = %v", store.deletedSecrets)
	}
	if !equalSlice(rep.SecretsDeleted, []string{"brg"}) {
		t.Errorf("SecretsDeleted = %v, want [brg]", rep.SecretsDeleted)
	}
}

// Scenario 5: org with empty environments → filtered out, no work for it.
func TestRun_FilteredByEmptyEnvironments(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		{Code: "acn", Environments: nil}, // test org, no envs → filter out
	}}
	minter := &stubMinter{}
	store := newStubStore()

	rep := runReconciler(t, src, minter, store, []string{"ttd", "acn"}, false)

	if !equalSlice(rep.FilteredNoEnv, []string{"acn"}) {
		t.Errorf("FilteredNoEnv = %v, want [acn]", rep.FilteredNoEnv)
	}
	if !equalSlice(rep.Desired, []string{"ttd"}) {
		t.Errorf("Desired = %v, want [ttd]", rep.Desired)
	}
	if containsString(minter.calls, "acn") {
		t.Errorf("acn should not be minted; got calls %v", minter.calls)
	}
}

// Scenario 6: whitelist excludes an otherwise-eligible org.
func TestRun_FilteredByWhitelist(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		{Code: "brg", Environments: []string{"production"}},
		{Code: "extra", Environments: []string{"production"}}, // not in whitelist
	}}
	minter := &stubMinter{}
	store := newStubStore()

	rep := runReconciler(t, src, minter, store, []string{"ttd", "brg"}, false)

	if !equalSlice(rep.FilteredWhitelist, []string{"extra"}) {
		t.Errorf("FilteredWhitelist = %v, want [extra]", rep.FilteredWhitelist)
	}
	if !equalSlice(rep.Desired, []string{"brg", "ttd"}) {
		t.Errorf("Desired = %v, want [brg ttd]", rep.Desired)
	}
}

// Scenario 7: Gitea fails for one org, others succeed; failed org omitted from CM.
func TestRun_GiteaPartialFailure(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		{Code: "brg", Environments: []string{"production"}},
		{Code: "dsb", Environments: []string{"production"}},
	}}
	minter := &stubMinter{
		errs: map[string]error{"brg": errors.New("gitea 500")},
	}
	store := newStubStore()

	rep := runReconciler(t, src, minter, store, []string{"ttd", "brg", "dsb"}, false)

	if rep.Outcome != OutcomePartial {
		t.Errorf("outcome = %v, want partial", rep.Outcome)
	}
	if len(rep.FailedOrgs) != 1 || rep.FailedOrgs[0].Org != "brg" || rep.FailedOrgs[0].Stage != StageMint {
		t.Errorf("FailedOrgs = %v, want [{brg mint ...}]", rep.FailedOrgs)
	}
	if containsString(rep.SecretsCreated, "brg") {
		t.Errorf("brg should not be in SecretsCreated; got %v", rep.SecretsCreated)
	}
	if !strings.Contains(store.appliedCMData[ConfigMapDataKey], "name: ttd") {
		t.Errorf("ConfigMap should include ttd")
	}
	if strings.Contains(store.appliedCMData[ConfigMapDataKey], "name: brg") {
		t.Errorf("ConfigMap should NOT include brg (mint failed)")
	}
}

// --- additional coverage ----------------------------------------------------

func TestRun_FatalOnSourceError(t *testing.T) {
	r, _ := New(Options{
		Source:        &stubSource{err: errors.New("cdn down")},
		Minter:        &stubMinter{},
		Store:         newStubStore(),
		SecretNameFor: secretNameFor,
		ConfigMapName: "runner-org-list",
		Whitelist:     []string{"ttd"},
	})
	_, err := r.Run(context.Background())
	if err == nil {
		t.Fatal("expected fatal error, got nil")
	}
}

func TestRun_FatalOnApplyConfigMapError(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{{Code: "ttd", Environments: []string{"tt02"}}}}
	store := newStubStore()
	store.applyCMErr = errors.New("apiserver hiccup")

	r, _ := New(Options{
		Source:        src,
		Minter:        &stubMinter{},
		Store:         store,
		SecretNameFor: secretNameFor,
		ConfigMapName: "runner-org-list",
		Whitelist:     []string{"ttd"},
	})
	_, err := r.Run(context.Background())
	if err == nil {
		t.Fatal("expected fatal error, got nil")
	}
}

func TestRun_SyncAllSkipsWhitelist(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{
		{Code: "ttd", Environments: []string{"tt02"}},
		{Code: "brg", Environments: []string{"production"}},
	}}
	r, _ := New(Options{
		Source:        src,
		Minter:        &stubMinter{},
		Store:         newStubStore(),
		SecretNameFor: secretNameFor,
		ConfigMapName: "runner-org-list",
		SyncAll:       true,
	})
	rep, err := r.Run(context.Background())
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if !equalSlice(rep.Desired, []string{"brg", "ttd"}) {
		t.Errorf("Desired = %v, want [brg ttd]", rep.Desired)
	}
	if len(rep.FilteredWhitelist) != 0 {
		t.Errorf("nothing should be filtered by whitelist when SyncAll=true; got %v", rep.FilteredWhitelist)
	}
}

func TestRun_UnlabelledManagedSecretIsSkippedOnDelete(t *testing.T) {
	src := &stubSource{orgs: []cdn.Org{{Code: "ttd", Environments: []string{"tt02"}}}}
	store := newStubStore()
	store.existsByName["altinn-gitea-runner-ttd-secret"] = true
	store.managed = []corev1.Secret{
		managedSecret("altinn-gitea-runner-ttd-secret", "ttd"),
		// drift: managed-by label but no org label
		{ObjectMeta: metav1.ObjectMeta{Name: "stray", Labels: map[string]string{"app.kubernetes.io/managed-by": "runner-org-sync"}}},
	}
	rep := runReconciler(t, src, &stubMinter{}, store, []string{"ttd"}, false)

	if rep.Outcome != OutcomeSuccess {
		t.Errorf("outcome = %v, want success", rep.Outcome)
	}
	if containsString(store.deletedSecrets, "stray") {
		t.Errorf("stray secret should not be deleted without org label; got deletes %v", store.deletedSecrets)
	}
}

func TestNew_Validation(t *testing.T) {
	cases := []struct {
		name string
		opts Options
	}{
		{"no source", Options{Minter: &stubMinter{}, Store: newStubStore(), SecretNameFor: secretNameFor, ConfigMapName: "x", Whitelist: []string{"a"}}},
		{"no minter", Options{Source: &stubSource{}, Store: newStubStore(), SecretNameFor: secretNameFor, ConfigMapName: "x", Whitelist: []string{"a"}}},
		{"no store", Options{Source: &stubSource{}, Minter: &stubMinter{}, SecretNameFor: secretNameFor, ConfigMapName: "x", Whitelist: []string{"a"}}},
		{"no secretNameFor", Options{Source: &stubSource{}, Minter: &stubMinter{}, Store: newStubStore(), ConfigMapName: "x", Whitelist: []string{"a"}}},
		{"no configMapName", Options{Source: &stubSource{}, Minter: &stubMinter{}, Store: newStubStore(), SecretNameFor: secretNameFor, Whitelist: []string{"a"}}},
		{"empty whitelist & !syncAll", Options{Source: &stubSource{}, Minter: &stubMinter{}, Store: newStubStore(), SecretNameFor: secretNameFor, ConfigMapName: "x"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, err := New(c.opts); err == nil {
				t.Errorf("expected error, got nil")
			}
		})
	}
}

// --- utilities --------------------------------------------------------------

func equalSlice(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	ac, bc := append([]string(nil), a...), append([]string(nil), b...)
	sort.Strings(ac)
	sort.Strings(bc)
	for i := range ac {
		if ac[i] != bc[i] {
			return false
		}
	}
	return true
}

func containsString(haystack []string, needle string) bool {
	for _, s := range haystack {
		if s == needle {
			return true
		}
	}
	return false
}
