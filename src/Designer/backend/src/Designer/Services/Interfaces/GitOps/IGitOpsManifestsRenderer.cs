using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;

namespace Altinn.Studio.Designer.Services.Interfaces.GitOps;

public interface IGitOpsManifestsRenderer
{
    Dictionary<string, string> GetBaseManifests();
    Dictionary<string, string> GetAppManifests(AltinnRepoContext context);
    Dictionary<string, string> GetEnvironmentOverlayManifests(AltinnEnvironment environment, HashSet<AltinnRepoName> apps);
}
