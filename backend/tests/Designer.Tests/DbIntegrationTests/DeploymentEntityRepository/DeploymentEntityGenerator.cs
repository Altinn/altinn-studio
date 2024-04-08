using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public static class DeploymentEntityGenerator
{
    public static DeploymentEntity GenerateDeploymentEntity(string org, string app = null, string buildId = null, string tagname = null, BuildStatus buildStatus = BuildStatus.Completed, BuildResult buildResult = BuildResult.Succeeded)
    {
        BuildEntity build = new()
        {
            Id = buildId ?? Guid.NewGuid().ToString(),
            Status = buildStatus,
            Result = buildResult,

        };
        return new DeploymentEntity
        {
            Org = org,
            App = app ?? Guid.NewGuid().ToString(),
            Build = build,
            TagName = tagname ?? Guid.NewGuid().ToString(),
            EnvName = Guid.NewGuid().ToString(),
            Created = DateTime.UtcNow,
        };
    }

    public static IEnumerable<DeploymentEntity> GenerateDeploymentEntities(string org, string app, int count) =>
        Enumerable.Range(0, count)
            .Select(x => GenerateDeploymentEntity(org, app)).ToList();
}
