using System;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ContactMethodDbModel
{
    public Guid Id { get; set; }
    public Guid ContactPointId { get; set; }
    public ContactMethodType MethodType { get; set; }
    public string Value { get; set; } = string.Empty;
    public ContactPointDbModel ContactPoint { get; set; } = null!;
}
