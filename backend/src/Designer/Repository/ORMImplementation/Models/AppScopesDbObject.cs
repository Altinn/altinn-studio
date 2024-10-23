using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class AppScopesDbObject
{
    public long Id { get; set; }
    public string App { get; set; }
    public string Org { get; set; }
    public DateTimeOffset Created { get; set; }
    public string Scopes { get; set; }
    public string CreatedBy { get; set; }
    public string LastModifiedBy { get; set; }
}
