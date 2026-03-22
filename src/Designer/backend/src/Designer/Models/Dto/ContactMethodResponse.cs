using System;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactMethodResponse
{
    public Guid Id { get; set; }
    public required string MethodType { get; set; }
    public required string Value { get; set; }
}
