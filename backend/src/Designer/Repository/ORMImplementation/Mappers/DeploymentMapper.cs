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
            Buildresult = deploymentEntity.Build.Result.ToEnumMemberAttributeValue(),
            Created = deploymentEntity.Created,
            Entity = JsonSerializer.Serialize(deploymentEntity, s_jsonOptions)
        };
    }
    public static Deployment MapToDbModel(long sequenceNo, DeploymentEntity deploymentEntity)
    {
        var dbModel = MapToDbModel(deploymentEntity);
        dbModel.Sequenceno = sequenceNo;
        return dbModel;
    }

    public static DeploymentEntity MapToModel(Deployment deployment)
    {
        return JsonSerializer.Deserialize<DeploymentEntity>(deployment.Entity, s_jsonOptions);
    }

    public static IEnumerable<DeploymentEntity> MapToModels(IEnumerable<Deployment> deployments)
    {
        return deployments.Select(MapToModel);
    }
}
