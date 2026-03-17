using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public class OrgAlertPersonResponse
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public AlertSeverity EmailSeverity { get; set; }
    public string? Phone { get; set; }
    public AlertSeverity SmsSeverity { get; set; }
    public bool IsActive { get; set; }
    public List<string>? Services { get; set; }
}
