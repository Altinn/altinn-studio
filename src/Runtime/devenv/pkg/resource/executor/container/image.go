package containerbackend

import (
	"context"
	"errors"
	"fmt"

	"altinn.studio/devenv/pkg/container/types"
	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

func (b Backend) applyRemoteImage(
	ctx context.Context,
	backendCtx executor.BackendContext,
	img *resource.RemoteImage,
) (executor.Output, error) {
	_, err := b.client.ImageInspect(ctx, img.Ref)
	imageExists := err == nil
	if err != nil && !errors.Is(err, types.ErrImageNotFound) {
		return nil, fmt.Errorf("inspect image %s: %w", img.Ref, err)
	}

	switch img.PullPolicy {
	case resource.PullAlways:
		if pullErr := b.client.ImagePullWithProgress(ctx, img.Ref, func(update types.ProgressUpdate) {
			backendCtx.NotifyProgress(img.ID(), progressFromContainerUpdate(update))
		}); pullErr != nil {
			return nil, fmt.Errorf("pull image %s: %w", img.Ref, pullErr)
		}
	case resource.PullIfNotPresent:
		if !imageExists {
			if pullErr := b.client.ImagePullWithProgress(ctx, img.Ref, func(update types.ProgressUpdate) {
				backendCtx.NotifyProgress(img.ID(), progressFromContainerUpdate(update))
			}); pullErr != nil {
				return nil, fmt.Errorf("pull image %s: %w", img.Ref, pullErr)
			}
		}
	case resource.PullNever:
		if !imageExists {
			return nil, fmt.Errorf("%w: %s", errImageMissingForPullNever, img.Ref)
		}
	default:
		return nil, fmt.Errorf("%w %v for %s", errImagePullPolicyUnsupported, img.PullPolicy, img.Ref)
	}

	info, err := b.client.ImageInspect(ctx, img.Ref)
	if err != nil {
		return nil, fmt.Errorf("inspect image %s: %w", img.Ref, err)
	}

	return executor.ImageOutput{ImageID: info.ID}, nil
}

func (b Backend) applyLocalImage(
	ctx context.Context,
	backendCtx executor.BackendContext,
	img *resource.LocalImage,
) (executor.Output, error) {
	dockerfile := img.Dockerfile
	if dockerfile == "" {
		dockerfile = "Dockerfile"
	}

	if err := b.client.BuildWithProgress(ctx, img.ContextPath, dockerfile, img.Tag, func(update types.ProgressUpdate) {
		backendCtx.NotifyProgress(img.ID(), progressFromContainerUpdate(update))
	}, img.Build); err != nil {
		return nil, fmt.Errorf("build image %s: %w", img.Tag, err)
	}

	info, err := b.client.ImageInspect(ctx, img.Tag)
	if err != nil {
		return nil, fmt.Errorf("inspect built image %s: %w", img.Tag, err)
	}

	return executor.ImageOutput{ImageID: info.ID}, nil
}

func (b Backend) imageStatus(ctx context.Context, ref string) (executor.Status, error) {
	_, err := b.client.ImageInspect(ctx, ref)
	if err != nil {
		if errors.Is(err, types.ErrImageNotFound) {
			return executor.StatusDestroyed, nil
		}
		return executor.StatusUnknown, fmt.Errorf("inspect image %s: %w", ref, err)
	}
	return executor.StatusReady, nil
}
