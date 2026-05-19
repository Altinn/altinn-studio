using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services.GitOps;

public class GitOpsManifestsRendererTests : FluentTestsBase<GitOpsManifestsRendererTests>
{
    private Dictionary<string, string> RenderedBaseManifests { get; set; }
    private Dictionary<string, string> RenderedAppManifests { get; set; }
    private Dictionary<string, string> RenderedEnvManifests { get; set; }

    [Theory]
    [MemberData(nameof(ManifestTestDataProvider.BaseManifestsTestData), MemberType = typeof(ManifestTestDataProvider))]
    public void RenderedBaseManifest_ShouldEqualExpected(Dictionary<string, string> expectedManifests)
    {
        Given.That.BaseManifestsRendered().Then.Manifests_ShouldEqualExpected(expectedManifests, RenderedBaseManifests);
    }

    [Theory]
    [MemberData(nameof(ManifestTestDataProvider.AppsManifestsTestData), MemberType = typeof(ManifestTestDataProvider))]
    public void RenderedAppsManifests_ShouldEqualExpected(
        AltinnRepoContext context,
        Dictionary<string, string> expectedManifests
    )
    {
        Given
            .That.AppManifestsRendered(context)
            .Then.Manifests_ShouldEqualExpected(expectedManifests, RenderedAppManifests);
    }

    [Theory]
    [MemberData(
        nameof(ManifestTestDataProvider.EnvironmentManifestsTestData),
        MemberType = typeof(ManifestTestDataProvider)
    )]
    public void RenderedEnvironmentManifests_ShouldEqualExpected(
        AltinnEnvironment environment,
        HashSet<AltinnRepoName> apps,
        Dictionary<string, string> expectedManifests
    )
    {
        Given
            .That.EnvironmentManifestsRendered(environment, apps)
            .Then.Manifests_ShouldEqualExpected(expectedManifests, RenderedEnvManifests);
    }

    [Fact]
    public void RenderedEnvironmentManifests_ShouldSortAppResourcesByName()
    {
        HashSet<AltinnRepoName> apps = [AltinnRepoName.FromName("z-app"), AltinnRepoName.FromName("a-app")];

        Given.That.EnvironmentManifestsRendered(AltinnEnvironment.FromName("prod"), apps);

        string kustomization = RenderedEnvManifests["./prod/kustomization.yaml"];
        Assert.True(
            kustomization.IndexOf("../apps/a-app") < kustomization.IndexOf("../apps/z-app"),
            "Environment app resources should be rendered alphabetically by app name."
        );
    }

    private GitOpsManifestsRendererTests BaseManifestsRendered()
    {
        GitOpsManifestsRenderer renderer = new();
        RenderedBaseManifests = renderer.GetBaseManifests();
        return this;
    }

    private GitOpsManifestsRendererTests AppManifestsRendered(AltinnRepoContext context)
    {
        GitOpsManifestsRenderer renderer = new();
        RenderedAppManifests = renderer.GetAppManifests(context);
        return this;
    }

    private GitOpsManifestsRendererTests EnvironmentManifestsRendered(
        AltinnEnvironment environment,
        HashSet<AltinnRepoName> apps
    )
    {
        GitOpsManifestsRenderer renderer = new();
        RenderedEnvManifests = renderer.GetEnvironmentOverlayManifests(environment, apps);
        return this;
    }

    private void Manifests_ShouldEqualExpected(
        Dictionary<string, string> expectedManifests,
        Dictionary<string, string> actualManifests
    )
    {
        Assert.Equal(expectedManifests.Count, actualManifests.Count);

        foreach (var kvp in expectedManifests)
        {
            Assert.True(actualManifests.ContainsKey(kvp.Key), $"Missing key: {kvp.Key}");
            Assert.Equal(kvp.Value, actualManifests[kvp.Key]);
        }
    }
}
