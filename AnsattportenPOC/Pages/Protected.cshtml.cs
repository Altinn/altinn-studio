using Duende.AccessTokenManagement.OpenIdConnect;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AnsattportenPOC.Pages;

internal class ProtectedModel : PageModel
{
    private readonly ILogger<ProtectedModel> _logger;
    private readonly IMaskinportenIntegrationsClient _maskinportenClient;

    public List<ScopeAccess> AvailableScopes { get; set; } = [];

    public ProtectedModel(ILogger<ProtectedModel> logger, IMaskinportenIntegrationsClient maskinportenClient)
    {
        _logger = logger;
        _maskinportenClient = maskinportenClient;
    }

    public async Task<IActionResult> OnGet()
    {
        AvailableScopes = await _maskinportenClient.GetAvailableScopes();
        // await Task.CompletedTask;
        // AvailableScopes = [new ScopeAccess { Scope = "Hmm" }];
        return Page();
    }
}
