//nolint:testpackage // Tests internal merge functions not exported API.
package config

import "testing"

func TestMergeImageSpec(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		defaults ImageSpec
		user     ImageSpec
		want     ImageSpec
	}{
		{
			name:     "tag only override",
			defaults: ImageSpec{Image: "default/image", Tag: "v1.0.0"},
			user:     ImageSpec{Image: "", Tag: "v2.0.0"},
			want:     ImageSpec{Image: "default/image", Tag: "v2.0.0"},
		},
		{
			name:     "image only override",
			defaults: ImageSpec{Image: "default/image", Tag: "v1.0.0"},
			user:     ImageSpec{Image: "custom/image", Tag: ""},
			want:     ImageSpec{Image: "custom/image", Tag: "v1.0.0"},
		},
		{
			name:     "both image and tag override",
			defaults: ImageSpec{Image: "default/image", Tag: "v1.0.0"},
			user:     ImageSpec{Image: "custom/image", Tag: "v2.0.0"},
			want:     ImageSpec{Image: "custom/image", Tag: "v2.0.0"},
		},
		{
			name:     "no override (empty user)",
			defaults: ImageSpec{Image: "default/image", Tag: "v1.0.0"},
			user:     ImageSpec{Image: "", Tag: ""},
			want:     ImageSpec{Image: "default/image", Tag: "v1.0.0"},
		},
		{
			name:     "empty defaults with user override",
			defaults: ImageSpec{Image: "", Tag: ""},
			user:     ImageSpec{Image: "custom/image", Tag: "v2.0.0"},
			want:     ImageSpec{Image: "custom/image", Tag: "v2.0.0"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := mergeImageSpec(tt.defaults, tt.user)
			if got != tt.want {
				t.Errorf("mergeImageSpec() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestMerge(t *testing.T) {
	t.Parallel()

	t.Run("tag only override for localtest", func(t *testing.T) {
		t.Parallel()
		defaults := PersistedConfig{
			Images: ImagesConfig{
				Core: CoreImages{
					Localtest: ImageSpec{Image: "ghcr.io/altinn/localtest", Tag: "v1.0.0"},
				},
			},
		}
		user := PersistedConfig{
			Images: ImagesConfig{
				Core: CoreImages{
					Localtest: ImageSpec{Image: "", Tag: "v2.0.0"},
				},
			},
		}

		result := merge(defaults, user)

		want := ImageSpec{Image: "ghcr.io/altinn/localtest", Tag: "v2.0.0"}
		if result.Images.Core.Localtest != want {
			t.Errorf("merge() Localtest = %+v, want %+v", result.Images.Core.Localtest, want)
		}
	})

	t.Run("image only override for pdf3", func(t *testing.T) {
		t.Parallel()
		defaults := PersistedConfig{
			Images: ImagesConfig{
				Core: CoreImages{
					PDF3: ImageSpec{Image: "ghcr.io/altinn/pdf3", Tag: "v1.0.0"},
				},
			},
		}
		user := PersistedConfig{
			Images: ImagesConfig{
				Core: CoreImages{
					PDF3: ImageSpec{Image: "custom/pdf3", Tag: ""},
				},
			},
		}

		result := merge(defaults, user)

		want := ImageSpec{Image: "custom/pdf3", Tag: "v1.0.0"}
		if result.Images.Core.PDF3 != want {
			t.Errorf("merge() PDF3 = %+v, want %+v", result.Images.Core.PDF3, want)
		}
	})

	t.Run("multiple images with mixed overrides", func(t *testing.T) {
		t.Parallel()
		defaults := PersistedConfig{
			Images: ImagesConfig{
				Core: CoreImages{
					Localtest: ImageSpec{Image: "ghcr.io/altinn/localtest", Tag: "v1.0.0"},
					PDF3:      ImageSpec{Image: "ghcr.io/altinn/pdf3", Tag: "v1.0.0"},
				},
				Monitoring: MonitoringImages{
					Tempo: ImageSpec{Image: "grafana/tempo", Tag: "v1.0.0"},
				},
			},
		}
		user := PersistedConfig{
			Images: ImagesConfig{
				Core: CoreImages{
					Localtest: ImageSpec{Image: "", Tag: "v2.0.0"},
					PDF3:      ImageSpec{Image: "custom/pdf3", Tag: ""},
				},
				Monitoring: MonitoringImages{
					Tempo: ImageSpec{Image: "custom/tempo", Tag: "v2.0.0"},
				},
			},
		}

		result := merge(defaults, user)

		tests := []struct {
			name string
			got  ImageSpec
			want ImageSpec
		}{
			{
				name: "localtest tag only",
				got:  result.Images.Core.Localtest,
				want: ImageSpec{Image: "ghcr.io/altinn/localtest", Tag: "v2.0.0"},
			},
			{
				name: "pdf3 image only",
				got:  result.Images.Core.PDF3,
				want: ImageSpec{Image: "custom/pdf3", Tag: "v1.0.0"},
			},
			{
				name: "tempo both",
				got:  result.Images.Monitoring.Tempo,
				want: ImageSpec{Image: "custom/tempo", Tag: "v2.0.0"},
			},
		}

		for _, tt := range tests {
			if tt.got != tt.want {
				t.Errorf("%s: got %+v, want %+v", tt.name, tt.got, tt.want)
			}
		}
	})
}
