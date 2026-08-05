package internal

import (
	"context"
	"errors"
	"testing"
)

var errTriggerValidation = errors.New("trigger validation failed")

type releaseTriggerPullRequestReaderFunc func(context.Context, string) ([]releaseTriggerPullRequest, error)

func (f releaseTriggerPullRequestReaderFunc) pullRequestsForCommit(
	ctx context.Context,
	sha string,
) ([]releaseTriggerPullRequest, error) {
	return f(ctx, sha)
}

func TestResolveReleaseTriggerManual(t *testing.T) {
	t.Parallel()

	tests := []struct {
		wantErr   error
		name      string
		component string
		refName   string
		refType   string
	}{
		{name: "app from main", component: "app", refName: "main", refType: "branch"},
		{
			name:      "studioctl from release branch",
			component: "studioctl",
			refName:   "release/studioctl/v1.2",
			refType:   "branch",
		},
		{
			name:      "component does not match release branch",
			component: "app",
			refName:   "release/studioctl/v1.2",
			refType:   "branch",
			wantErr:   errBaseBranchMismatch,
		},
		{
			name:      "tags are rejected",
			component: "app",
			refName:   "app/v9.0.0",
			refType:   "tag",
			wantErr:   errReleaseTriggerBranchRequired,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := resolveReleaseTriggerWithDeps(t.Context(), ReleaseTriggerRequest{
				EventName:         "workflow_dispatch",
				RefName:           tc.refName,
				RefType:           tc.refType,
				SHA:               "fedcba9876543210",
				SelectedComponent: tc.component,
			}, nil, nil)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("resolveReleaseTriggerWithDeps() error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveReleaseTriggerWithDeps() error = %v", err)
			}
			if got.Component != tc.component || got.BaseBranch != tc.refName || got.MergeSHA != "fedcba9876543210" {
				t.Fatalf("resolveReleaseTriggerWithDeps() = %+v", got)
			}
		})
	}
}

func TestResolveReleaseTriggerPush(t *testing.T) {
	t.Parallel()

	appPR := releaseTriggerPullRequest{
		Number:   123,
		MergedAt: "2026-08-05T10:00:00Z",
		Base:     releaseTriggerPullRequestBase{Ref: "main"},
		Labels:   []releaseTriggerPullRequestLabel{{Name: "release/app"}},
	}

	tests := []struct {
		validateErr  error
		wantErr      error
		want         ReleaseTriggerResult
		name         string
		refName      string
		pullRequests []releaseTriggerPullRequest
	}{
		{
			name:         "merged app release",
			refName:      "main",
			pullRequests: []releaseTriggerPullRequest{appPR},
			want: ReleaseTriggerResult{
				Component:         "app",
				BaseBranch:        "main",
				MergeSHA:          "0123456789abcdef",
				PullRequestNumber: "123",
			},
		},
		{
			name:    "merged studioctl release branch",
			refName: "release/studioctl/v1.2",
			pullRequests: []releaseTriggerPullRequest{{
				Number:   456,
				MergedAt: "2026-08-05T10:00:00Z",
				Base:     releaseTriggerPullRequestBase{Ref: "release/studioctl/v1.2"},
				Labels:   []releaseTriggerPullRequestLabel{{Name: "release/studioctl"}},
			}},
			want: ReleaseTriggerResult{
				Component:         "studioctl",
				BaseBranch:        "release/studioctl/v1.2",
				MergeSHA:          "0123456789abcdef",
				PullRequestNumber: "456",
			},
		},
		{
			name: "ordinary changelog push is a no-op",
			pullRequests: []releaseTriggerPullRequest{{
				Number:   123,
				MergedAt: "2026-08-05T10:00:00Z",
				Base:     releaseTriggerPullRequestBase{Ref: "main"},
				Labels:   []releaseTriggerPullRequestLabel{{Name: "area/app"}},
			}},
			refName: "main",
			want: ReleaseTriggerResult{
				BaseBranch: "main",
				MergeSHA:   "0123456789abcdef",
			},
		},
		{
			name: "unmerged and other-base PRs are ignored",
			pullRequests: []releaseTriggerPullRequest{
				{Number: 123, Base: releaseTriggerPullRequestBase{Ref: "main"}, Labels: appPR.Labels},
				{
					Number:   124,
					MergedAt: appPR.MergedAt,
					Base:     releaseTriggerPullRequestBase{Ref: "other"},
					Labels:   appPR.Labels,
				},
			},
			refName: "main",
			want: ReleaseTriggerResult{
				BaseBranch: "main",
				MergeSHA:   "0123456789abcdef",
			},
		},
		{
			name: "multiple release labels are rejected",
			pullRequests: []releaseTriggerPullRequest{{
				Number:   appPR.Number,
				MergedAt: appPR.MergedAt,
				Base:     appPR.Base,
				Labels: []releaseTriggerPullRequestLabel{
					{Name: "release/app"},
					{Name: "release/studioctl"},
				},
			}},
			refName: "main",
			wantErr: errReleaseTriggerLabelCount,
		},
		{
			name: "multiple release PRs are rejected",
			pullRequests: []releaseTriggerPullRequest{
				appPR,
				{Number: 124, MergedAt: appPR.MergedAt, Base: appPR.Base, Labels: appPR.Labels},
			},
			refName: "main",
			wantErr: errReleaseTriggerPullRequestCount,
		},
		{
			name:         "component changelog validation errors are propagated",
			pullRequests: []releaseTriggerPullRequest{appPR},
			refName:      "main",
			validateErr:  errTriggerValidation,
			wantErr:      errTriggerValidation,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			validated := false
			got, err := resolveReleaseTriggerWithDeps(
				t.Context(),
				ReleaseTriggerRequest{
					EventName: "push",
					RefName:   tc.refName,
					RefType:   "branch",
					SHA:       "0123456789abcdef",
					BeforeSHA: "abcdef0123456789",
				},
				releaseTriggerPullRequestReaderFunc(func(context.Context, string) ([]releaseTriggerPullRequest, error) {
					return tc.pullRequests, nil
				}),
				func(_ context.Context, component, base, head string) error {
					validated = true
					if component == "" || base != "abcdef0123456789" || head != "0123456789abcdef" {
						t.Fatalf("validator called with component=%q base=%q head=%q", component, base, head)
					}
					return tc.validateErr
				},
			)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("resolveReleaseTriggerWithDeps() error = %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("resolveReleaseTriggerWithDeps() error = %v", err)
			}
			if got != tc.want {
				t.Fatalf("resolveReleaseTriggerWithDeps() = %+v, want %+v", got, tc.want)
			}
			if got.Component != "" && !validated {
				t.Fatal("release trigger did not validate the component changelog")
			}
		})
	}
}

func TestParseReleaseTriggerPullRequestPages(t *testing.T) {
	t.Parallel()

	output := `[[{"number":123,"merged_at":"2026-08-05T10:00:00Z","base":{"ref":"main"},"labels":[{"name":"release/app"}]}],[]]`
	pullRequests, err := parseReleaseTriggerPullRequestPages(output)
	if err != nil {
		t.Fatalf("parseReleaseTriggerPullRequestPages() error = %v", err)
	}
	if len(pullRequests) != 1 || pullRequests[0].Number != 123 {
		t.Fatalf("parseReleaseTriggerPullRequestPages() = %+v", pullRequests)
	}
}
