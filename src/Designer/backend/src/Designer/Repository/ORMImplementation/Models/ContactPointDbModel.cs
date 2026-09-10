using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ContactPointDbModel
{
    public Guid Id { get; set; }
    public string Org { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<string> Environments { get; set; } = [];
    public List<ContactMethodDbModel> Methods { get; set; } = [];
    public Guid? CreatedByUserAccountId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Guid? UpdatedByUserAccountId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public UserAccountDbModel? CreatedByUserAccount { get; set; }
    public UserAccountDbModel? UpdatedByUserAccount { get; set; }
    public int ReportFrequency { get; set; }
}
