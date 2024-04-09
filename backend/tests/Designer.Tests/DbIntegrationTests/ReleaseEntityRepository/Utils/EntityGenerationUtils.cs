using System;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static ReleaseEntity GenerateReleaseEntity(string org, string app = null, string buildId = null, string targetCommitish = null, string tagname = null, BuildStatus buildStatus = BuildStatus.Completed, BuildResult buildResult = BuildResult.Succeeded)
    {
        BuildEntity build = GenerateBuildEntity(buildId, buildStatus, buildResult);

        return new ReleaseEntity
        {
            Org = org,
            App = app ?? Guid.NewGuid().ToString(),
            Build = build,
            TagName = tagname ?? Guid.NewGuid().ToString(),
            Created = DateTime.UtcNow,
            TargetCommitish = targetCommitish ?? Guid.NewGuid().ToString(),
        };
    }
}
