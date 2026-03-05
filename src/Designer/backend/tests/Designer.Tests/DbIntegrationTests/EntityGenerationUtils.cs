using System;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static partial class Build
    {
        public static BuildEntity GenerateBuildEntity(
            string buildId = null,
            BuildStatus buildStatus = BuildStatus.Completed,
            BuildResult buildResult = BuildResult.Succeeded,
            DateTime? finished = null
        )
        {
            string id = buildId ?? Guid.NewGuid().ToString();
            return new BuildEntity
            {
                Id = id,
                ExternalId = id,
                Status = buildStatus,
                Result = buildResult,
                Started = DateTime.UtcNow,
                Finished = finished,
            };
        }
    }
}
