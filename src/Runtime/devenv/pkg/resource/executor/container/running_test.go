package containerbackend

import (
	"context"
	"testing"

	containermock "altinn.studio/devenv/pkg/container/mock"
	"altinn.studio/devenv/pkg/container/types"
)

func TestGraphRunning(t *testing.T) {
	t.Parallel()

	for name, tc := range map[string]struct {
		containers []types.ContainerInfo
		want       bool
	}{
		"none":    {containers: nil, want: false},
		"stopped": {containers: []types.ContainerInfo{{Name: "a", State: types.ContainerState{Running: false}}}, want: false},
		"running": {
			containers: []types.ContainerInfo{
				{Name: "a", State: types.ContainerState{Running: false}},
				{Name: "b", State: types.ContainerState{Running: true}},
			},
			want: true,
		},
	} {
		client := containermock.New()
		client.ListContainersFunc = func(_ context.Context, filter types.ContainerListFilter) ([]types.ContainerInfo, error) {
			if filter.Labels[GraphIDLabel] != testGraphID.String() {
				t.Errorf("%s: filter %+v, want the graph's ownership label", name, filter)
			}
			return tc.containers, nil
		}
		got, err := GraphRunning(t.Context(), client, testGraphID)
		if err != nil || got != tc.want {
			t.Errorf("%s: GraphRunning() = %v, %v, want %v", name, got, err, tc.want)
		}
	}
}
