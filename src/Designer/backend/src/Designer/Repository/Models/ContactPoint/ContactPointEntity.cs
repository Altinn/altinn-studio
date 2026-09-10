using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Models.ContactPoints;

namespace Altinn.Studio.Designer.Repository.Models.ContactPoint;

public class ContactPointEntity
{
    public Guid Id { get; set; }
    public required string Org { get; set; }
    public required string Name { get; set; }
    public bool IsActive { get; set; }
    public List<string> Environments { get; set; } = [];
    public List<ContactMethodEntity> Methods { get; set; } = [];
    public Guid? CreatedByUserAccountId { get; init; }
    public string? CreatedByUsername { get; init; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? UpdatedByUserAccountId { get; init; }
    public string? UpdatedByUsername { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public ReportFrequency ReportFrequency { get; set; }
}
