package localtest

import "altinn.studio/studioctl/internal/envtopology"

type localtestConfig struct {
	appHost string
	baseURL string
}

func newLocaltestConfig(topology envtopology.Local) localtestConfig {
	return localtestConfig{
		appHost: topology.AppHostName(),
		baseURL: topology.LocaltestBaseURL(),
	}
}

func (c localtestConfig) localtestEnv(ingressPort string) map[string]string {
	return map[string]string{
		"ASPNETCORE_URLS":                                       localtestListenURLs(ingressPort),
		"DOTNET_ENVIRONMENT":                                    "Development",
		"GeneralSettings__BaseUrl":                              c.baseURL,
		"GeneralSettings__HostName":                             c.appHost,
		"LocalPlatformSettings__LocalTestingStorageBasePath":    "/AltinnPlatformLocal/",
		"LocalPlatformSettings__LocalTestingStaticTestDataPath": "/testdata/",
		envtopology.BoundTopologyOptionsBaseConfigPathEnv:       envtopology.BoundTopologyBaseConfigContainerPath,
		envtopology.BoundTopologyOptionsConfigPathEnv:           envtopology.BoundTopologyConfigContainerPath,
	}
}

func (c localtestConfig) pdfEnv() map[string]string {
	return map[string]string{
		"TZ":                             "Europe/Oslo",
		"PDF3_ENVIRONMENT":               "localtest",
		"PDF3_QUEUE_SIZE":                "3",
		"PDF3_LOCALTEST_PUBLIC_BASE_URL": c.baseURL,
	}
}

func (c localtestConfig) workflowEngineEnv() map[string]string {
	return map[string]string{
		"ASPNETCORE_ENVIRONMENT":              "Docker",
		"ConnectionStrings__WorkflowEngine":   "Host=" + ContainerWorkflowEngineDb + ";Port=" + postgresPort + ";Database=" + workflowEngineDB + ";Username=" + postgresUser + ";Password=" + postgresPassword,
		"AppCommandSettings__CommandEndpoint": c.baseURL + "/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/",
	}
}
