using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ContactMethodDbModel
{
    public Guid Id { get; set; }
    public Guid ContactPointId { get; set; }
    public string MethodType { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public ContactPointDbModel ContactPoint { get; set; } = null!;
}
