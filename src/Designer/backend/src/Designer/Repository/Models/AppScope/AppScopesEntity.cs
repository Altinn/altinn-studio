using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.AppScope;

public class AppScopesEntity
{
    public ISet<MaskinPortenScopeEntity> Scopes { get; set; }
    public DateTimeOffset Created { get; set; }
    public string CreatedBy { get; set; }
    public string App { get; set; }
    public string Org { get; set; }
    public string LastModifiedBy { get; set; }
    public uint Version { get; set; }
}

