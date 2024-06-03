using System;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static BuildEntity GenerateBuildEntity(string buildId = null, BuildStatus buildStatus = BuildStatus.Completed, BuildResult buildResult = BuildResult.Succeeded, DateTime? finished = null)
    {
        return new BuildEntity
        {
            Id = buildId ?? Guid.NewGuid().ToString(),
            Status = buildStatus,
            Result = buildResult,
            Started = DateTime.UtcNow,
            Finished = finished
        };
    }
}
