using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityGenerationUtils
{
    public static class Release
    {
        public static ReleaseEntity GenerateReleaseEntity(string org, string app = null, string buildId = null, string body = "build message", string targetCommitish = null, string tagname = null, BuildStatus buildStatus = BuildStatus.Completed, BuildResult buildResult = BuildResult.Succeeded)
        {
            BuildEntity build = Build.GenerateBuildEntity(buildId, buildStatus, buildResult);

            return new ReleaseEntity
            {
                Org = org,
                App = app ?? Guid.NewGuid().ToString(),
                Build = build,
                TagName = tagname ?? Guid.NewGuid().ToString(),
                Created = DateTime.UtcNow,
                TargetCommitish = targetCommitish ?? Guid.NewGuid().ToString(),
                Body = body
            };
        }

        public static IEnumerable<ReleaseEntity> GenerateReleaseEntities(string org, string app, int count) =>
            Enumerable.Range(0, count)
                .Select(x =>
                {
                    Thread.Sleep(1); // To ensure unique timestamps
                    return GenerateReleaseEntity(org, app);
                }).ToList();
    }
}
