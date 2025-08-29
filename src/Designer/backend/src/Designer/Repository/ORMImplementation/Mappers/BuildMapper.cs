using System;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class BuildMapper
{
    public static BuildEntity MapToModel(BuildDbModel buildDbModel) =>
        new()
        {
            Id = buildDbModel.ExternalId,
            Status = Enum.Parse<BuildStatus>(buildDbModel.Status, true),
            Result = Enum.Parse<BuildResult>(buildDbModel.Result, true),
            Started = buildDbModel.Started?.UtcDateTime,
            Finished = buildDbModel.Finished?.UtcDateTime
        };

    public static BuildDbModel MapToDbModel(BuildEntity buildEntity, BuildType buildType) =>
        new()
        {
            ExternalId = buildEntity.Id,
            Status = buildEntity.Status.ToString(),
            Result = buildEntity.Result.ToString(),
            Started = buildEntity.Started?.ToUniversalTime(),
            Finished = buildEntity.Finished?.ToUniversalTime(),
            BuildType = buildType
        };
}
