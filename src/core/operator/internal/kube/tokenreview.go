package kube

import (
	"context"
	"fmt"

	authenticationv1 "k8s.io/api/authentication/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"altinn.studio/core-operator/internal/auth"
)

// TokenReviewer checks projected ServiceAccount tokens with a TokenReview, which needs the ClusterRole in config/base.
type TokenReviewer struct {
	Client client.Client
}

var _ auth.Reviewer = TokenReviewer{}

func (r TokenReviewer) Review(ctx context.Context, token string, audiences []string) (auth.TokenStatus, error) {
	review := &authenticationv1.TokenReview{
		Spec: authenticationv1.TokenReviewSpec{Token: token, Audiences: audiences},
	}
	if err := r.Client.Create(ctx, review); err != nil {
		return auth.TokenStatus{}, fmt.Errorf("create TokenReview: %w", err)
	}
	return auth.TokenStatus{
		Authenticated: review.Status.Authenticated,
		Username:      review.Status.User.Username,
		Audiences:     review.Status.Audiences,
	}, nil
}
