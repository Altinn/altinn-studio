using System;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class BuildMapper
{
    public static BuildEntity MapToModel(BuildDbObject buildDbObject) =>
        new()
        {
            Id = buildDbObject.ExternalId,
            Status = Enum.Parse<BuildStatus>(buildDbObject.Status, true),
            Result = Enum.Parse<BuildResult>(buildDbObject.Result, true),
            Started = buildDbObject.Started?.DateTime,
            Finished = buildDbObject.Finished?.DateTime
        };

    public static BuildDbObject MapToDbModel(BuildEntity buildEntity, BuildType buildType) =>
        new()
        {
            ExternalId = buildEntity.Id,
            Status = buildEntity.Status.ToString(),
            Result = buildEntity.Result.ToString(),
            Started = buildEntity.Started,
            Finished = buildEntity.Finished,
            BuildType = buildType
        };
}
