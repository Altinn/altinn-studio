package k8sstate

import (
	"context"
	"sort"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

const testNamespace = "studio-runners"

func TestCreateRegistrationSecret_SetsLabelsAndData(t *testing.T) {
	c := fake.NewSimpleClientset()
	s := NewStore(c, testNamespace)

	if err := s.CreateRegistrationSecret(context.Background(), "altinn-gitea-runner-ttd-secret", "ttd", "tok-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got, err := c.CoreV1().Secrets(testNamespace).Get(context.Background(), "altinn-gitea-runner-ttd-secret", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if got.Type != corev1.SecretTypeOpaque {
		t.Errorf("type = %v, want Opaque", got.Type)
	}
	if string(got.Data[SecretTokenKey]) != "tok-1" {
		t.Errorf("data[%s] = %q, want %q", SecretTokenKey, string(got.Data[SecretTokenKey]), "tok-1")
	}
	if got.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by = %q, want %q", got.Labels[LabelManagedBy], ManagedBy)
	}
	if got.Labels[LabelComponent] != ComponentRegToken {
		t.Errorf("component = %q, want %q", got.Labels[LabelComponent], ComponentRegToken)
	}
	if got.Labels[LabelOrg] != "ttd" {
		t.Errorf("org label = %q, want ttd", got.Labels[LabelOrg])
	}
}

func TestCreateRegistrationSecret_AlreadyExists(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "x", Namespace: testNamespace},
	})
	s := NewStore(c, testNamespace)
	err := s.CreateRegistrationSecret(context.Background(), "x", "ttd", "tok")
	if err == nil {
		t.Fatal("expected error for duplicate, got nil")
	}
}

func TestSecretExists(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "exists", Namespace: testNamespace},
	})
	s := NewStore(c, testNamespace)

	ok, err := s.SecretExists(context.Background(), "exists")
	if err != nil || !ok {
		t.Errorf("SecretExists(exists) = %v, %v; want true, nil", ok, err)
	}
	ok, err = s.SecretExists(context.Background(), "missing")
	if err != nil || ok {
		t.Errorf("SecretExists(missing) = %v, %v; want false, nil", ok, err)
	}
}

func TestRegistrationSecretStatus(t *testing.T) {
	c := fake.NewSimpleClientset(
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "valid",
				Namespace: testNamespace,
				Labels: map[string]string{
					LabelManagedBy: ManagedBy,
					LabelComponent: ComponentRegToken,
					LabelOrg:       "ttd",
				},
			},
			Type: corev1.SecretTypeOpaque,
			Data: map[string][]byte{SecretTokenKey: []byte("tok")},
		},
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "foreign",
				Namespace: testNamespace,
				Labels:    map[string]string{LabelManagedBy: "someone-else"},
			},
			Type: corev1.SecretTypeOpaque,
			Data: map[string][]byte{SecretTokenKey: []byte("tok")},
		},
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "empty-token",
				Namespace: testNamespace,
				Labels: map[string]string{
					LabelManagedBy: ManagedBy,
					LabelComponent: ComponentRegToken,
					LabelOrg:       "ttd",
				},
			},
			Type: corev1.SecretTypeOpaque,
			Data: map[string][]byte{SecretTokenKey: nil},
		},
	)
	s := NewStore(c, testNamespace)

	tests := []struct {
		name       string
		secretName string
		org        string
		want       RegistrationSecretState
	}{
		{name: "valid", secretName: "valid", org: "ttd", want: RegistrationSecretValid},
		{name: "missing", secretName: "missing", org: "ttd", want: RegistrationSecretMissing},
		{name: "foreign same name", secretName: "foreign", org: "ttd", want: RegistrationSecretInvalid},
		{name: "wrong org", secretName: "valid", org: "brg", want: RegistrationSecretInvalid},
		{name: "empty token", secretName: "empty-token", org: "ttd", want: RegistrationSecretInvalid},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := s.RegistrationSecretStatus(context.Background(), tt.secretName, tt.org)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("RegistrationSecretStatus() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDeleteSecret_IdempotentOnMissing(t *testing.T) {
	c := fake.NewSimpleClientset()
	s := NewStore(c, testNamespace)
	if err := s.DeleteSecret(context.Background(), "never-existed"); err != nil {
		t.Errorf("delete missing should be nil, got %v", err)
	}
}

func TestDeleteSecret_RemovesExisting(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "x", Namespace: testNamespace},
	})
	s := NewStore(c, testNamespace)
	if err := s.DeleteSecret(context.Background(), "x"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	ok, _ := s.SecretExists(context.Background(), "x")
	if ok {
		t.Errorf("secret still exists after delete")
	}
}

func TestListManagedSecrets_OnlyOurs(t *testing.T) {
	managed1 := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: "ours-ttd", Namespace: testNamespace,
			Labels: map[string]string{
				LabelManagedBy: ManagedBy,
				LabelComponent: ComponentRegToken,
				LabelOrg:       "ttd",
			},
		},
	}
	managed2 := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: "ours-brg", Namespace: testNamespace,
			Labels: map[string]string{
				LabelManagedBy: ManagedBy,
				LabelComponent: ComponentRegToken,
				LabelOrg:       "brg",
			},
		},
	}
	foreign := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: "stranger", Namespace: testNamespace,
			Labels: map[string]string{LabelManagedBy: "someone-else"},
		},
	}
	c := fake.NewSimpleClientset(managed1, managed2, foreign)
	s := NewStore(c, testNamespace)

	got, err := s.ListManagedSecrets(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("got %d secrets, want 2", len(got))
	}
	names := []string{got[0].Name, got[1].Name}
	sort.Strings(names)
	if names[0] != "ours-brg" || names[1] != "ours-ttd" {
		t.Errorf("got secrets %v, want [ours-brg ours-ttd]", names)
	}
}

func TestApplyConfigMap_CreatesWhenMissing(t *testing.T) {
	c := fake.NewSimpleClientset()
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyConfigMap(context.Background(), "runner-org-list", map[string]string{"runners.yaml": "- name: ttd\n"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Error("changed = false, want true (create)")
	}
	cm, err := c.CoreV1().ConfigMaps(testNamespace).Get(context.Background(), "runner-org-list", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if cm.Data["runners.yaml"] != "- name: ttd\n" {
		t.Errorf("data wrong: %v", cm.Data)
	}
	if cm.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by label missing, got %v", cm.Labels)
	}
}

func TestApplyConfigMap_NoOpOnSameContent(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name: "cm", Namespace: testNamespace,
			Labels: map[string]string{
				LabelManagedBy: ManagedBy,
				LabelComponent: ComponentRunnerCM,
			},
		},
		Data: map[string]string{"k": "v"},
	})
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyConfigMap(context.Background(), "cm", map[string]string{"k": "v"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if changed {
		t.Error("changed = true, want false (no diff)")
	}
}

func TestApplyConfigMap_UpdatesOnLabelDrift(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "cm",
			Namespace: testNamespace,
			Labels:    map[string]string{"custom": "keep"},
		},
		Data: map[string]string{"k": "v"},
	})
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyConfigMap(context.Background(), "cm", map[string]string{"k": "v"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Error("changed = false, want true (label drift)")
	}
	got, _ := c.CoreV1().ConfigMaps(testNamespace).Get(context.Background(), "cm", metav1.GetOptions{})
	if got.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by label was not restored, got %v", got.Labels)
	}
	if got.Labels[LabelComponent] != ComponentRunnerCM {
		t.Errorf("component label was not restored, got %v", got.Labels)
	}
	if got.Labels["custom"] != "keep" {
		t.Errorf("custom label was not preserved, got %v", got.Labels)
	}
}

func TestApplyConfigMap_UpdatesOnDifference(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "cm", Namespace: testNamespace},
		Data:       map[string]string{"k": "old"},
	})
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyConfigMap(context.Background(), "cm", map[string]string{"k": "new"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Error("changed = false, want true (update)")
	}
	got, _ := c.CoreV1().ConfigMaps(testNamespace).Get(context.Background(), "cm", metav1.GetOptions{})
	if got.Data["k"] != "new" {
		t.Errorf("data not updated: %v", got.Data)
	}
	if got.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by label was not added on update, got %v", got.Labels)
	}
}

func TestOrgFromSecret(t *testing.T) {
	s := corev1.Secret{ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{LabelOrg: "ttd"}}}
	if got := OrgFromSecret(s); got != "ttd" {
		t.Errorf("OrgFromSecret = %q, want ttd", got)
	}
	if got := OrgFromSecret(corev1.Secret{}); got != "" {
		t.Errorf("OrgFromSecret on unlabelled secret = %q, want empty", got)
	}
}

func TestApplyOpaqueSecret_CreatesWhenMissing(t *testing.T) {
	c := fake.NewSimpleClientset()
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyOpaqueSecret(context.Background(), "keda-gitea-pat", "token", "pat-value")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Error("changed = false, want true (create)")
	}
	got, err := c.CoreV1().Secrets(testNamespace).Get(context.Background(), "keda-gitea-pat", metav1.GetOptions{})
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Type != corev1.SecretTypeOpaque {
		t.Errorf("type = %v, want Opaque", got.Type)
	}
	if string(got.Data["token"]) != "pat-value" {
		t.Errorf("data[token] = %q, want pat-value", string(got.Data["token"]))
	}
	if got.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by = %q, want %q", got.Labels[LabelManagedBy], ManagedBy)
	}
}

func TestApplyOpaqueSecret_NoOpOnSameValue(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name: "keda-gitea-pat", Namespace: testNamespace,
			Labels: map[string]string{LabelManagedBy: ManagedBy},
		},
		Type: corev1.SecretTypeOpaque,
		Data: map[string][]byte{"token": []byte("pat-value")},
	})
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyOpaqueSecret(context.Background(), "keda-gitea-pat", "token", "pat-value")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if changed {
		t.Error("changed = true, want false (no diff)")
	}
}

func TestApplyOpaqueSecret_UpdatesOnLabelDrift(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "keda-gitea-pat",
			Namespace: testNamespace,
			Labels:    map[string]string{"custom": "keep"},
		},
		Type: corev1.SecretTypeOpaque,
		Data: map[string][]byte{"token": []byte("pat-value")},
	})
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyOpaqueSecret(context.Background(), "keda-gitea-pat", "token", "pat-value")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Error("changed = false, want true (label drift)")
	}
	got, _ := c.CoreV1().Secrets(testNamespace).Get(context.Background(), "keda-gitea-pat", metav1.GetOptions{})
	if got.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by label was not restored, got %v", got.Labels)
	}
	if got.Labels["custom"] != "keep" {
		t.Errorf("custom label was not preserved, got %v", got.Labels)
	}
	if string(got.Data["token"]) != "pat-value" {
		t.Errorf("token = %q, want pat-value", string(got.Data["token"]))
	}
}

func TestApplyOpaqueSecret_UpdatesOnDifference(t *testing.T) {
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "keda-gitea-pat", Namespace: testNamespace},
		Type:       corev1.SecretTypeOpaque,
		Data:       map[string][]byte{"token": []byte("old-pat")},
	})
	s := NewStore(c, testNamespace)

	changed, err := s.ApplyOpaqueSecret(context.Background(), "keda-gitea-pat", "token", "new-pat")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Error("changed = false, want true (update)")
	}
	got, _ := c.CoreV1().Secrets(testNamespace).Get(context.Background(), "keda-gitea-pat", metav1.GetOptions{})
	if string(got.Data["token"]) != "new-pat" {
		t.Errorf("data[token] = %q, want new-pat", string(got.Data["token"]))
	}
	if got.Labels[LabelManagedBy] != ManagedBy {
		t.Errorf("managed-by label was not added on update, got %v", got.Labels)
	}
}

func TestApplyOpaqueSecret_PreservesOtherKeys(t *testing.T) {
	// Some other actor wrote an unrelated key into the Secret; we must not
	// stomp on it when applying ours. This is defence in depth against an
	// operator that manages multiple keys in one Opaque Secret.
	c := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "shared", Namespace: testNamespace},
		Type:       corev1.SecretTypeOpaque,
		Data: map[string][]byte{
			"token": []byte("old-pat"),
			"other": []byte("not-ours"),
		},
	})
	s := NewStore(c, testNamespace)

	if _, err := s.ApplyOpaqueSecret(context.Background(), "shared", "token", "new-pat"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	got, _ := c.CoreV1().Secrets(testNamespace).Get(context.Background(), "shared", metav1.GetOptions{})
	if string(got.Data["other"]) != "not-ours" {
		t.Errorf("other key was overwritten: %q", string(got.Data["other"]))
	}
	if string(got.Data["token"]) != "new-pat" {
		t.Errorf("token = %q, want new-pat", string(got.Data["token"]))
	}
}

func TestApplyOpaqueSecret_RejectsEmptyKey(t *testing.T) {
	c := fake.NewSimpleClientset()
	s := NewStore(c, testNamespace)
	if _, err := s.ApplyOpaqueSecret(context.Background(), "x", "", "v"); err == nil {
		t.Fatal("expected error for empty key, got nil")
	}
}
