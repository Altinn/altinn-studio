using Microsoft.AspNetCore.Builder;

namespace TestApp.Shared;

/// <summary>
/// Interface for configuring endpoints in the test application
/// </summary>
public interface IEndpointConfigurator
{
    void ConfigureEndpoints(WebApplication app);
}
