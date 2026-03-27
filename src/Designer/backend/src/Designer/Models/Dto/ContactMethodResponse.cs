using System;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactMethodResponse
{
    public Guid Id { get; set; }
    public required ContactMethodType MethodType { get; set; }
    public required string Value { get; set; }
}
