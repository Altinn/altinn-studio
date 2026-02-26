#nullable enable

namespace LocalTest.Models;

/// <summary>
/// Request model for app registration
/// </summary>
public class AppRegistrationRequest
{
    /// <summary>
    /// Application ID in org/app format
    /// </summary>
    public required string AppId { get; set; }

    /// <summary>
    /// Port number the app is running on
    /// </summary>
    public required int Port { get; set; }
}
