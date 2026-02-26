#nullable disable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public record AppScopesUpsertRequest
{
    public ISet<MaskinPortenScopeDto> Scopes { get; set; }
}
