using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Deployment = Altinn.Studio.Designer.Repository.ORMImplementation.Models.Deployment;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class DeploymentMapper
{
    private static readonly JsonSerializerOptions s_jsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public static Deployment MapToDbModel(DeploymentEntity deploymentEntity)
    {
        return new Deployment
        {
            Buildid = deploymentEntity.Build.Id,
            Tagname = deploymentEntity.TagName,
            Org = deploymentEntity.Org,
            App = deploymentEntity.App,
            EnvName = deploymentEntity.EnvName,
            Buildresult = deploymentEntity.Build.Result.ToEnumMemberAttributeValue(),
            Created = deploymentEntity.Created.ToUniversalTime(),
            Entity = JsonSerializer.Serialize(deploymentEntity, s_jsonOptions),
            Build = BuildMapper.MapToDbModel(deploymentEntity.Build),
        };
    }
    public static Deployment MapToDbModel(DeploymentEntity deploymentEntity, long deploymentSequenceNo, long buildId)
    {
        var dbModel = MapToDbModel(deploymentEntity);
        dbModel.Sequenceno = deploymentSequenceNo;
        dbModel.InternalBuildId = buildId;
        dbModel.Build.Id = buildId;
        return dbModel;
    }

    public static DeploymentEntity MapToModel(Deployment dbObject)
    {
        return new DeploymentEntity
        {
            App = dbObject.App,
            Org = dbObject.Org,
            EnvName = dbObject.EnvName,
            TagName = dbObject.Tagname,
            Build = BuildMapper.MapToModel(dbObject.Build),
            Created = dbObject.Created,
            CreatedBy = dbObject.CreatedBy
        };
    }

    public static IEnumerable<DeploymentEntity> MapToModels(IEnumerable<Deployment> deployments)
    {
        return deployments.Select(MapToModel);
    }
}
