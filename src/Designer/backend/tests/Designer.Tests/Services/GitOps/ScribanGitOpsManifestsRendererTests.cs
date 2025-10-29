#nullable disable
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.GitOps;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services.GitOps;

public class ScribanGitOpsManifestsRendererTests : FluentTestsBase<ScribanGitOpsManifestsRendererTests>
{
    private Dictionary<string, string> RenderedBaseManifests { get; set; }
    private Dictionary<string, string> RenderedAppManifests { get; set; }
    private Dictionary<string, string> RenderedEnvManifests { get; set; }


    [Theory]
    [MemberData(nameof(ManifestTestDataProvider.BaseManifestsTestData), MemberType = typeof(ManifestTestDataProvider))]
    public void RenderedBaseManifest_ShouldEqualExpected(Dictionary<string, string> expectedManifests)
    {
        Given.That
            .BaseManifestsRendered()
            .Then
            .Manifests_ShouldEqualExpected(expectedManifests, RenderedBaseManifests);
    }


    [Theory]
    [MemberData(nameof(ManifestTestDataProvider.AppsManifestsTestData), MemberType = typeof(ManifestTestDataProvider))]
    public void RenderedAppsManifests_ShouldEqualExpected(AltinnRepoContext context, Dictionary<string, string> expectedManifests)
    {

        Given.That
            .AppManifestsRendered(context)
            .Then
            .Manifests_ShouldEqualExpected(expectedManifests, RenderedAppManifests);
    }


    [Theory]
    [MemberData(nameof(ManifestTestDataProvider.EnvironmentManifestsTestData), MemberType = typeof(ManifestTestDataProvider))]
    public void RenderedEnvironmentManifests_ShouldEqualExpected(AltinnEnvironment environment, HashSet<AltinnRepoName> apps, Dictionary<string, string> expectedManifests)
    {
        Given.That
            .EnvironmentManifestsRendered(environment, apps)
            .Then
            .Manifests_ShouldEqualExpected(expectedManifests, RenderedEnvManifests);
    }


    private ScribanGitOpsManifestsRendererTests BaseManifestsRendered()
    {
        ScribanGitOpsManifestsRenderer renderer = new();
        RenderedBaseManifests = renderer.GetBaseManifests();
        return this;
    }

    private ScribanGitOpsManifestsRendererTests AppManifestsRendered(AltinnRepoContext context)
    {
        ScribanGitOpsManifestsRenderer renderer = new();
        RenderedAppManifests = renderer.GetAppManifests(context);
        return this;
    }

    private ScribanGitOpsManifestsRendererTests EnvironmentManifestsRendered(AltinnEnvironment environment, HashSet<AltinnRepoName> apps)
    {
        ScribanGitOpsManifestsRenderer renderer = new();
        RenderedEnvManifests = renderer.GetEnvironmentOverlayManifests(environment, apps);
        return this;
    }

    private void Manifests_ShouldEqualExpected(Dictionary<string, string> expectedManifests,
        Dictionary<string, string> actualManifests)
    {
        Assert.Equal(expectedManifests.Count, actualManifests.Count);

        foreach (var kvp in expectedManifests)
        {
            Assert.True(actualManifests.ContainsKey(kvp.Key), $"Missing key: {kvp.Key}");
            Assert.Equal(kvp.Value, actualManifests[kvp.Key]);
        }
    }
}
