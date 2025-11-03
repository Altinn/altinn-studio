#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
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
        Converters = { new JsonStringEnumConverter() }
    };

    public static DeploymentDbModel MapToDbModel(DeploymentEntity deploymentEntity)
    {
        return new DeploymentDbModel
        {
            Buildid = deploymentEntity.Build.Id,
            Tagname = deploymentEntity.TagName,
            Org = deploymentEntity.Org,
            App = deploymentEntity.App,
            EnvName = deploymentEntity.EnvName,
            Buildresult = deploymentEntity.Build.Result.ToEnumMemberAttributeValue(),
            Created = deploymentEntity.Created.ToUniversalTime(),
            CreatedBy = deploymentEntity.CreatedBy,
            DeploymentType = (Altinn.Studio.Designer.Repository.ORMImplementation.Models.DeploymentType)(int)deploymentEntity.DeploymentType,
            Entity = JsonSerializer.Serialize(deploymentEntity, s_jsonOptions),
            Build = BuildMapper.MapToDbModel(deploymentEntity.Build, deploymentEntity.DeploymentType == Altinn.Studio.Designer.Repository.Models.DeploymentType.Deploy ? BuildType.Deployment : BuildType.Decommission)
        };
    }
    public static DeploymentDbModel MapToDbModel(DeploymentEntity deploymentEntity, long deploymentSequenceNo, long buildId)
    {
        var dbModel = MapToDbModel(deploymentEntity);
        dbModel.Sequenceno = deploymentSequenceNo;
        dbModel.InternalBuildId = buildId;
        dbModel.Build.Id = buildId;
        return dbModel;
    }

    public static DeploymentEntity MapToModel(DeploymentDbModel dbObject)
    {
        return new DeploymentEntity
        {
            App = dbObject.App,
            Org = dbObject.Org,
            EnvName = dbObject.EnvName,
            TagName = dbObject.Tagname,
            Build = BuildMapper.MapToModel(dbObject.Build),
            Created = dbObject.Created.ToUniversalTime(),
            CreatedBy = dbObject.CreatedBy,
            DeploymentType = (Altinn.Studio.Designer.Repository.Models.DeploymentType)(int)dbObject.DeploymentType
        };
    }

    public static IEnumerable<DeploymentEntity> MapToModels(IEnumerable<DeploymentDbModel> deployments)
    {
        return deployments.Select(MapToModel);
    }
}
