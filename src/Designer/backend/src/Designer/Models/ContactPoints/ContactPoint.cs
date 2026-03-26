using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.ContactPoints;

public class ContactPoint
{
    public Guid Id { get; init; }
    public required string Org { get; init; }
    public required string Name { get; init; }
    public bool IsActive { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public List<string> Environments { get; init; } = [];
    public List<ContactMethod> Methods { get; init; } = [];
}
