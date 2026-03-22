using System;

namespace Altinn.Studio.Designer.Repository.Models.ContactPoint;

public class ContactMethodEntity
{
    public Guid Id { get; set; }
    public Guid ContactPointId { get; set; }
    public required string MethodType { get; set; }
    public required string Value { get; set; }
}
