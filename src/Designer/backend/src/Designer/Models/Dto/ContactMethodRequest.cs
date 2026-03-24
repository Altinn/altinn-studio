using System.ComponentModel.DataAnnotations;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactMethodRequest
{
    public required ContactMethodType MethodType { get; set; }

    [MaxLength(255)]
    public required string Value { get; set; }
}
