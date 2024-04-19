using Duende.AccessTokenManagement.OpenIdConnect;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AnsattportenPOC.Pages;

internal class ProtectedModel : PageModel
{
    private readonly ILogger<ProtectedModel> _logger;
    public List<ScopeAccess> AvailableScopes { get; set; } = [];

    public ProtectedModel(ILogger<ProtectedModel> logger)
    {
        _logger = logger;
    }

    public async Task<IActionResult> OnGet([FromServices] MaskinportenIntegrationsClient client)
    {
        AvailableScopes = await client.GetAvailableScopes();
        // await Task.CompletedTask;
        // AvailableScopes = [new ScopeAccess { Scope = "Hmm" }];
        return Page();
    }
}
