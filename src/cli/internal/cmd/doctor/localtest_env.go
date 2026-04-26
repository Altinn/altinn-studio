package doctor

import (
	"context"

	envlocaltest "altinn.studio/studioctl/internal/cmd/env/localtest"
	"altinn.studio/studioctl/internal/envtopology"
)

func (s *Service) buildLocaltestEnv(ctx context.Context) *envlocaltest.DiagnosticReport {
	topology := envtopology.NewLocal(envtopology.DefaultIngressPortString())
	return envlocaltest.Diagnose(ctx, envlocaltest.DiagnosticOptions{
		Debugf:          s.debugf,
		DetectContainer: s.containerDetect,
		ResolveHost:     nil,
		HTTPGet:         nil,
		DialTCP:         nil,
		IPv6Enabled:     nil,
		Topology:        topology,
	})
}
