#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class ReleaseMapper
{
    private static readonly JsonSerializerOptions s_jsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public static ReleaseDbModel MapToDbModel(ReleaseEntity releaseEntity)
    {
        return new ReleaseDbModel
        {
            Buildid = releaseEntity.Build.Id,
            Tagname = releaseEntity.TagName,
            Org = releaseEntity.Org,
            App = releaseEntity.App,
            Buildstatus = releaseEntity.Build.Status.ToEnumMemberAttributeValue(),
            Buildresult = releaseEntity.Build.Result.ToEnumMemberAttributeValue(),
            Created = releaseEntity.Created,
            Entity = JsonSerializer.Serialize(releaseEntity, s_jsonOptions)
        };
    }

    public static ReleaseDbModel MapToDbModel(long sequenceNo, ReleaseEntity releaseEntity)
    {
        var dbModel = MapToDbModel(releaseEntity);
        dbModel.Sequenceno = sequenceNo;
        return dbModel;
    }

    public static ReleaseEntity MapToModel(ReleaseDbModel releaseDbModel)
    {
        return JsonSerializer.Deserialize<ReleaseEntity>(releaseDbModel.Entity, s_jsonOptions);
    }

    public static IEnumerable<ReleaseEntity> MapToModels(IEnumerable<ReleaseDbModel> releases)
    {
        return releases.Select(MapToModel);
    }
}
