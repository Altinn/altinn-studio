using System.Linq;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;

public static class ContactPointMapper
{
    public static ContactPointDbModel MapToDbModel(ContactPointEntity entity)
    {
        return new ContactPointDbModel
        {
            Id = entity.Id,
            Org = entity.Org,
            Name = entity.Name,
            IsActive = entity.IsActive,
            Environments = entity.Environments,
            CreatedByUserAccountId = entity.CreatedByUserAccountId,
            CreatedAt = entity.CreatedAt,
            UpdatedByUserAccountId = entity.UpdatedByUserAccountId,
            UpdatedAt = entity.UpdatedAt,
            Methods = entity
                .Methods.Select(m => new ContactMethodDbModel
                {
                    Id = m.Id,
                    ContactPointId = m.ContactPointId,
                    MethodType = m.MethodType,
                    Value = m.Value,
                })
                .ToList(),
        };
    }

    public static ContactPointEntity MapToEntity(ContactPointDbModel dbModel)
    {
        return new ContactPointEntity
        {
            Id = dbModel.Id,
            Org = dbModel.Org,
            Name = dbModel.Name,
            IsActive = dbModel.IsActive,
            Environments = dbModel.Environments,
            CreatedByUserAccountId = dbModel.CreatedByUserAccountId,
            CreatedAt = dbModel.CreatedAt,
            UpdatedByUserAccountId = dbModel.UpdatedByUserAccountId,
            UpdatedAt = dbModel.UpdatedAt,
            Methods = dbModel
                .Methods.Select(m => new ContactMethodEntity
                {
                    Id = m.Id,
                    ContactPointId = m.ContactPointId,
                    MethodType = m.MethodType,
                    Value = m.Value,
                })
                .ToList(),
        };
    }
}
