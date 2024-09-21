using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public record AppScopesRequest
{
    public ISet<MaskinPortenScopeDto> Scopes { get; set; }
}
