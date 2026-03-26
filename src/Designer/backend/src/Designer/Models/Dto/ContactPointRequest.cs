using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactPointRequest
{
    [MaxLength(100)]
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<string> Environments { get; set; } = [];
    public required List<ContactMethodRequest> Methods { get; set; }
}
