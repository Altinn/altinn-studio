using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public record AppScopesResponse
{
    public ISet<MaskinPortenScopeResponse> Scopes { get; set; }
}
