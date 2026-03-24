using System;

namespace Altinn.Studio.Designer.Models.ContactPoints;

public class ContactMethod
{
    public Guid Id { get; init; }
    public required string MethodType { get; init; }
    public required string Value { get; init; }
}
