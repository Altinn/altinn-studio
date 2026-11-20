using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Models.Dto;

public class ContactPointResponse
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<string> Environments { get; set; } = [];
    public required List<ContactMethodResponse> Methods { get; set; }
    public string? CreatedByUsername { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? UpdatedByUsername { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ReportFrequency ReportFrequency { get; set; }
}
