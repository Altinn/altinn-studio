#nullable enable
using Microsoft.AspNetCore.Mvc.Rendering;

namespace LocalTest.Models;

public class TokensViewModel
{
    public required IEnumerable<SelectListItem> TestUsers { get; init; }
    public required List<SelectListItem> AuthenticationLevels { get; init; }
    public required string DefaultOrg { get; init; }
}