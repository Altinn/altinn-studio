using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Admin.Configuration;

/// <summary>
/// Configuration for test tools token generator.
/// Store credentials securely using user secrets, environment variables, or Azure Key Vault.
/// </summary>
public class TestToolsTokenGeneratorSettings
{
    [Required]
    public required string BaseUrl { get; init; }

    [Required(ErrorMessage = "Username is required for test tools token generation")]
    public required string Username { get; init; }

    [Required(ErrorMessage = "Password is required for test tools token generation")]
    public required string Password { get; init; }
}
