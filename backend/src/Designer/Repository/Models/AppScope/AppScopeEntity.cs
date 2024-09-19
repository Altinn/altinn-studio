using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models.AppScope;

public class AppScopeEntity : BaseEntity
{
    public long Id { get; set; }
    public ISet<MaskinPortenScopeEntity> Scopes { get; set; }
    public string LastModifiedBy { get; set; }
}

