using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactPointRequest
{
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<string> Environments { get; set; } = [];
    public required List<ContactMethodRequest> Methods { get; set; }
}
