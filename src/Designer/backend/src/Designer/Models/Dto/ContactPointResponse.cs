using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactPointResponse
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<string> Environments { get; set; } = [];
    public required List<ContactMethodResponse> Methods { get; set; }
}
