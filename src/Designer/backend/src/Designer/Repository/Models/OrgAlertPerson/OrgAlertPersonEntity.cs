using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;

public class OrgAlertPersonEntity
{
    public Guid Id { get; set; }
    public required string Org { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public AlertSeverity EmailSeverity { get; set; }
    public string? Phone { get; set; }
    public AlertSeverity SmsSeverity { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<string>? Services { get; set; }
}
