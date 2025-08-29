using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static class Deployment
    {
        public static DeploymentEntity GenerateDeploymentEntity(string org, string app = null, string buildId = null, string tagname = null, BuildStatus buildStatus = BuildStatus.Completed, BuildResult buildResult = BuildResult.Succeeded, string envName = null)
        {
            BuildEntity build = Build.GenerateBuildEntity(buildId, buildStatus, buildResult);

            return new DeploymentEntity
            {
                Org = org,
                App = app ?? Guid.NewGuid().ToString(),
                Build = build,
                TagName = tagname ?? Guid.NewGuid().ToString(),
                EnvName = envName ?? Guid.NewGuid().ToString(),
                Created = DateTime.UtcNow,
                CreatedBy = "testUser"
            };
        }

        public static IEnumerable<DeploymentEntity> GenerateDeploymentEntities(string org, string app, int count, string envName = null) =>
            Enumerable.Range(0, count)
                .Select(x =>
                {
                    Thread.Sleep(1); // To ensure unique timestamps
                    return GenerateDeploymentEntity(org, app, envName: envName);
                }).ToList();
    }

}
