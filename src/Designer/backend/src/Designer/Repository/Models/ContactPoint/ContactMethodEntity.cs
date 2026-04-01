using System;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Repository.Models.ContactPoint;

public class ContactMethodEntity
{
    public Guid Id { get; set; }
    public Guid ContactPointId { get; set; }
    public required ContactMethodType MethodType { get; set; }
    public required string Value { get; set; }
}
