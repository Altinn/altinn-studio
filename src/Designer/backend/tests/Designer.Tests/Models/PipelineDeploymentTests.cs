using System;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Microsoft.AspNetCore.Mvc.NewtonsoftJson;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Designer.Tests.Models;

public class PipelineDeploymentTests
{
    [Fact]
    public void From_GivesTheJsonTheEntityGave()
    {
        var deployment = new DeploymentEntity
        {
            SequenceNo = 42,
            TagName = "8",
            EnvName = "tt02",
            DeploymentType = DeploymentType.Decommission,
            Build = new BuildEntity
            {
                Id = "142287",
                Status = BuildStatus.Completed,
                Result = BuildResult.Succeeded,
                Started = new DateTime(2026, 10, 31, 10, 0, 0, DateTimeKind.Utc),
                Finished = new DateTime(2026, 10, 31, 10, 4, 0, DateTimeKind.Utc),
            },
            Events =
            [
                new DeployEvent
                {
                    Message = "Upgrade succeeded",
                    Timestamp = new DateTimeOffset(2026, 10, 31, 10, 5, 0, TimeSpan.Zero),
                    EventType = DeployEventType.UpgradeSucceeded,
                    Created = new DateTimeOffset(2026, 10, 31, 10, 5, 1, TimeSpan.Zero),
                    Origin = DeployEventOrigin.Webhook,
                },
            ],
            Created = new DateTime(2026, 10, 31, 9, 59, 0, DateTimeKind.Utc),
            CreatedBy = "testuser",
            App = "my-app",
            Org = "ttd",
        };

        Assert.True(
            JToken.DeepEquals(AsMvcWritesIt(deployment), AsMvcWritesIt(PipelineDeployment.From(deployment))),
            $"{AsMvcWritesIt(PipelineDeployment.From(deployment))}\nis not\n{AsMvcWritesIt(deployment)}"
        );
    }

    [Fact]
    public void From_WithoutBuildOrEvents_GivesTheJsonTheEntityGave()
    {
        var deployment = new DeploymentEntity
        {
            TagName = "8",
            EnvName = "tt02",
            Created = new DateTime(2026, 10, 31, 9, 59, 0, DateTimeKind.Utc),
            App = "my-app",
            Org = "ttd",
        };

        Assert.True(JToken.DeepEquals(AsMvcWritesIt(deployment), AsMvcWritesIt(PipelineDeployment.From(deployment))));
    }

    private static JToken AsMvcWritesIt(object value)
    {
        JsonSerializerSettings settings = JsonSerializerSettingsProvider.CreateSerializerSettings();
        settings.Converters.Add(new StringEnumConverter());
        return JToken.Parse(JsonConvert.SerializeObject(value, settings));
    }
}
