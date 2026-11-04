#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class DeploymentMapper
{
    private static readonly JsonSerializerOptions s_jsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() },
        TypeInfoResolver = new DefaultJsonTypeInfoResolver
        {
            Modifiers =
            {
                static typeInfo =>
                {
                    if (typeInfo.Type != typeof(DeploymentEntity))
                    {
                        return;
                    }
                    var eventsProperty = typeInfo.Properties.FirstOrDefault(p =>
                        p.Name.Equals(nameof(DeploymentEntity.Events), StringComparison.OrdinalIgnoreCase)
                    );
                    if (eventsProperty != null)
                    {
                        eventsProperty.ShouldSerialize = (_, _) => false;
                    }
                },
            },
        },
    };

    public static DeploymentDbModel MapToDbModel(DeploymentEntity deploymentEntity)
    {
        var dbModel = new DeploymentDbModel
        {
            Tagname = deploymentEntity.TagName,
            Org = deploymentEntity.Org,
            App = deploymentEntity.App,
            EnvName = deploymentEntity.EnvName,
            Created = deploymentEntity.Created.ToUniversalTime(),
            CreatedBy = deploymentEntity.CreatedBy,
            DeploymentType = (Altinn.Studio.Designer.Repository.ORMImplementation.Models.DeploymentType)
                (int)deploymentEntity.DeploymentType,
            Entity = JsonSerializer.Serialize(deploymentEntity, s_jsonOptions),
        };

        if (deploymentEntity.Build != null)
        {
            dbModel.Buildid = deploymentEntity.Build.Id;
            dbModel.Buildresult = deploymentEntity.Build.Result.ToEnumMemberAttributeValue();
            dbModel.Build = BuildMapper.MapToDbModel(
                deploymentEntity.Build,
                deploymentEntity.DeploymentType == Altinn.Studio.Designer.Repository.Models.DeploymentType.Deploy
                    ? BuildType.Deployment
                    : BuildType.Decommission
            );
        }
        else
        {
            dbModel.Buildresult = BuildResult.None.ToEnumMemberAttributeValue();
        }

        return dbModel;
    }

    public static DeploymentDbModel MapToDbModel(
        DeploymentEntity deploymentEntity,
        long deploymentSequenceNo,
        long? buildId
    )
    {
        var dbModel = MapToDbModel(deploymentEntity);
        dbModel.Sequenceno = deploymentSequenceNo;
        if (buildId.HasValue)
        {
            dbModel.InternalBuildId = buildId.Value;
            if (dbModel.Build != null)
            {
                dbModel.Build.Id = buildId.Value;
            }
        }
        return dbModel;
    }

    public static DeploymentEntity MapToModel(DeploymentDbModel dbObject)
    {
        return new DeploymentEntity
        {
            SequenceNo = dbObject.Sequenceno,
            App = dbObject.App,
            Org = dbObject.Org,
            EnvName = dbObject.EnvName,
            TagName = dbObject.Tagname,
            Build = dbObject.Build != null ? BuildMapper.MapToModel(dbObject.Build) : null,
            Created = dbObject.Created.ToUniversalTime(),
            CreatedBy = dbObject.CreatedBy,
            DeploymentType = (Altinn.Studio.Designer.Repository.Models.DeploymentType)(int)dbObject.DeploymentType,
            Events =
                dbObject
                    .Events?.OrderBy(e => e.Created)
                    .Select(e => new DeployEvent
                    {
                        Message = e.Message,
                        Timestamp = e.Timestamp,
                        EventType = Enum.Parse<DeployEventType>(e.EventType),
                        Created = e.Created,
                        Origin = Enum.Parse<DeployEventOrigin>(e.Origin),
                    })
                    .ToList()
                ?? [],
        };
    }

    public static IEnumerable<DeploymentEntity> MapToModels(IEnumerable<DeploymentDbModel> deployments)
    {
        return deployments.Select(MapToModel);
    }
}
