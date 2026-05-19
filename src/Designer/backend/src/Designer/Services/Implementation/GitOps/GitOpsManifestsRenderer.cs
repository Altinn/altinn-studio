#nullable disable
using System.Collections.Generic;
using System.Text;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;

namespace Altinn.Studio.Designer.Services.Implementation.GitOps;

public class GitOpsManifestsRenderer : IGitOpsManifestsRenderer
{
    private const string BaseManifestsPath = "Services/Implementation/GitOps/Templates/base";

    public Dictionary<string, string> GetBaseManifests()
    {
        var baseResources = EmbeddedResourceHelper.ListEmbeddedResources(BaseManifestsPath);
        var manifests = new Dictionary<string, string>();
        foreach (string resource in baseResources)
        {
            manifests[$"./base/{EmbeddedResourceHelper.GetFileNameFromResourceName(resource)}"] =
                EmbeddedResourceHelper.ReadEmbeddedResourceAsString(resource);
        }
        return manifests;
    }

    public Dictionary<string, string> GetAppManifests(AltinnRepoContext context)
    {
        return new Dictionary<string, string>
        {
            {
                $"{ManifestsPathHelper.AppManifests.AppDirectoryPath(context.Repo)}/kustomization.yaml",
                GetAppKustomization()
            },
            {
                $"{ManifestsPathHelper.AppManifests.AppDirectoryPath(context.Repo)}/kustomize.yaml",
                GetAppKustomize(context.Repo)
            },
            {
                $"{ManifestsPathHelper.AppManifests.AppDirectoryPath(context.Repo)}/oci-repository.yaml",
                GetAppOciRepository(context.Org, context.Repo)
            },
        };
    }

    public Dictionary<string, string> GetEnvironmentOverlayManifests(
        AltinnEnvironment environment,
        HashSet<AltinnRepoName> apps
    )
    {
        return new Dictionary<string, string>
        {
            {
                $"{ManifestsPathHelper.EnvironmentManifests.DirectoryPath(environment.Name)}/kustomization.yaml",
                GetEnvironmentKustomization(environment.Name, apps)
            },
        };
    }

    private static string GetAppKustomization()
    {
        return """
            apiVersion: kustomize.config.k8s.io/v1beta1
            kind: Kustomization
            resources:
              - oci-repository.yaml
              - kustomize.yaml

            """;
    }

    private static string GetAppKustomize(string app)
    {
        return $"""
            apiVersion: kustomize.toolkit.fluxcd.io/v1
            kind: Kustomization
            metadata:
              name: {app}
              namespace: default
            spec:
              force: false
              interval: 5m0s
              path: ./
              prune: true
              retryInterval: 5m0s
              sourceRef:
                kind: OCIRepository
                name: {app}
                namespace: default
              targetNamespace: default
              timeout: 5m0s
              wait: true

            """;
    }

    private static string GetAppOciRepository(string org, string app)
    {
        return $"""
            apiVersion: source.toolkit.fluxcd.io/v1
            kind: OCIRepository
            metadata:
              name: {app}
              namespace: default
            spec:
              interval: 5m0s
              provider: azure
              ref:
                tag: main
              timeout: 5m0s
              url: oci://{org}altinnregistry01.azurecr.io/configs/{app}

            """;
    }

    private static string GetEnvironmentKustomization(string environment, IEnumerable<AltinnRepoName> apps)
    {
        var manifest = new StringBuilder(
            """
            apiVersion: kustomize.config.k8s.io/v1beta1
            kind: Kustomization
            resources:
              - ../base

            """
        );

        foreach (var app in apps)
        {
            manifest.AppendLine($"  - ../apps/{app.Name}");
        }

        manifest.Append(
            $"""

            patches:
              - target:
                  kind: OCIRepository
                patch: |-
                  - op: replace
                    path: /spec/ref/tag
                    value: {environment}

            """
        );

        return manifest.ToString();
    }
}
