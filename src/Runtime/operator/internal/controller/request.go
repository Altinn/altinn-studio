package controller

import (
	"context"
	"fmt"

	resourcesv1alpha1 "altinn.studio/operator/api/v1alpha1"
	"altinn.studio/operator/internal/resourcename"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
)

type requestKind int

const (
	RequestCreateKind requestKind = iota + 1
	RequestUpdateKind
	RequestDeleteKind
)

var requestKindToString = map[requestKind]string{
	RequestCreateKind: "Create",
	RequestUpdateKind: "Update",
	RequestDeleteKind: "Delete",
}

func (k requestKind) String() string {
	if s, ok := requestKindToString[k]; ok {
		return s
	}
	return UnknownStr
}

type maskinportenClientRequest struct {
	NamespacedName types.NamespacedName
	Name           string
	Namespace      string
	AppId          string
	AppLabel       string
	Kind           requestKind
	Instance       *resourcesv1alpha1.MaskinportenClient
}

func (r *MaskinportenClientReconciler) mapRequest(
	ctx context.Context,
	req ctrl.Request,
) (*maskinportenClientRequest, error) {
	_, span := r.runtime.Tracer().Start(ctx, "Reconcile.mapRequest")
	defer span.End()

	parsed, err := resourcename.ParseMaskinportenClientName(req.Name)
	if err != nil {
		return nil, fmt.Errorf("mapRequest: %w", err)
	}

	opCtx := r.runtime.GetOperatorContext()
	if parsed.ServiceOwnerId != opCtx.ServiceOwner.Id {
		return nil, fmt.Errorf("mapRequest: resource service owner %q does not match operator scope %q", parsed.ServiceOwnerId, opCtx.ServiceOwner.Id)
	}

	return &maskinportenClientRequest{
		NamespacedName: req.NamespacedName,
		Name:           req.Name,
		Namespace:      req.Namespace,
		AppId:          parsed.AppId,
		AppLabel:       fmt.Sprintf("%s-%s-deployment", opCtx.ServiceOwner.Id, parsed.AppId),
	}, nil
}
