using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.ContactPoint;

public class ContactPointEntity
{
    public Guid Id { get; set; }
    public required string Org { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<string> Environments { get; set; } = [];
    public List<ContactMethodEntity> Methods { get; set; } = [];
}
