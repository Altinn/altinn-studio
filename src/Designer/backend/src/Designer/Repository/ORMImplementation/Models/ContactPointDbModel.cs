using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ContactPointDbModel
{
    public Guid Id { get; set; }
    public string Org { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<string> Environments { get; set; } = [];
    public List<ContactMethodDbModel> Methods { get; set; } = [];
}
