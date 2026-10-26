package maskinporten

import (
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/maskinporten"
)

func TestClientReadiness(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name       string
		want       string
		conditions []metav1.Condition
	}{
		{name: "no condition yet", want: "unknown"},
		{
			name:       "ready",
			want:       "ready",
			conditions: []metav1.Condition{{Type: maskinporten.ConditionTypeReady, Status: metav1.ConditionTrue}},
		},
		{
			name:       "failed",
			want:       "not_ready",
			conditions: []metav1.Condition{{Type: maskinporten.ConditionTypeReady, Status: metav1.ConditionFalse}},
		},
		{
			name:       "unknown status",
			want:       "unknown",
			conditions: []metav1.Condition{{Type: maskinporten.ConditionTypeReady, Status: metav1.ConditionUnknown}},
		},
		{
			name:       "other conditions only",
			want:       "unknown",
			conditions: []metav1.Condition{{Type: maskinporten.ConditionTypeSecretSynced, Status: metav1.ConditionTrue}},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			client := &resourcesv1alpha1.MaskinportenClient{}
			client.Status.Conditions = tc.conditions
			if got := clientReadiness(client); got != tc.want {
				t.Errorf("clientReadiness() = %q, want %q", got, tc.want)
			}
		})
	}
}
