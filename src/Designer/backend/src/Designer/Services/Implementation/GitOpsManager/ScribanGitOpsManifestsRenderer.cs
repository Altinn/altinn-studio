using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Scriban;

namespace Altinn.Studio.Designer.Services.Implementation.GitOpsManager;

public class ScribanGitOpsManifestsRenderer : IGitOpsManifestsRenderer
{
    private const string BaseManifestsPath = "Services/Implementation/GitOpsManager/Templates/base";
    private const string AppManifestsPath = "Services/Implementation/GitOpsManager/Templates/apps";
    private const string EnvironmentOverlaysPath = "Services/Implementation/GitOpsManager/Templates/environment";
    public Dictionary<string, string> GetBaseManifests()
    {
        var baseResources = EmbeddedResourceHelper.ListEmbeddedResources(BaseManifestsPath);
        var manifests = new Dictionary<string, string>();
        foreach (string resource in baseResources)
        {
            manifests[$"./base/{EmbeddedResourceHelper.GetFileNameFromResourceName(resource)}"] = EmbeddedResourceHelper.ReadEmbeddedResourceAsString( resource);
        }
        return manifests;
    }

    public Dictionary<string, string> GetAppManifests(AltinnRepoContext context)
    {
        var appResources = EmbeddedResourceHelper.ListEmbeddedResources(AppManifestsPath);
        Dictionary<string, string> templateValues = new()
        {
            { "org", context.Org }, { "app", context.Repo }
        };
        var manifests = new Dictionary<string, string>();
        foreach (string resource in appResources)
        {
            string resourceTemplate = EmbeddedResourceHelper.ReadEmbeddedResourceAsString(resource);
            var manifestTemplate = Template.ParseLiquid(resourceTemplate);

            manifests[$"./apps/{context.Repo}/{EmbeddedResourceHelper.GetFileNameFromResourceName(resource)}"] =
                manifestTemplate.Render(templateValues);
        }
        return manifests;
    }

    public Dictionary<string, string> GetEnvironmentOverlayManifests(AltinnEnvironment environment,
        HashSet<AltinnRepoName> apps)
    {
        var envResources = EmbeddedResourceHelper.ListEmbeddedResources(EnvironmentOverlaysPath);
        Dictionary<string, object> templateValues = new() { { "environment", environment.Name }, { "apps", apps.Select(a => a.Name) } };
        var manifests = new Dictionary<string, string>();
        foreach (string resource in envResources)
        {
            string resourceTemplate = EmbeddedResourceHelper.ReadEmbeddedResourceAsString(resource);
            var manifestTemplate = Template.ParseLiquid(resourceTemplate);
            manifests[$"./{environment.Name}/{EmbeddedResourceHelper.GetFileNameFromResourceName(resource)}"] =
                manifestTemplate.Render(templateValues);
        }
        return manifests;
    }
}
