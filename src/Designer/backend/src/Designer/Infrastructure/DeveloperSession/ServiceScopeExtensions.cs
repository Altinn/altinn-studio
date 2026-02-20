using Altinn.Studio.Designer.Middleware;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public static class ServiceScopeExtensions
{
    /// <summary>
    /// Creates a DI scope with <see cref="DeveloperContext"/> set on the current async flow.
    /// Designed for background jobs (e.g. Quartz) that need to impersonate a developer.
    /// Do NOT use from web requests — the <see cref="DeveloperContextMiddleware"/> handles that.
    /// This overwrites the ambient <see cref="DeveloperContext"/> via <see cref="IDeveloperContextAccessor"/>,
    /// which is backed by AsyncLocal and flows through the entire execution context.
    /// </summary>
    /// <example>
    /// <code>
    /// using var scope = scopeFactory.CreateAuthenticatedScope(developerContextAccessor, "someuser");
    /// var service = scope.ServiceProvider.GetRequiredService&lt;ISomeService&gt;();
    /// await service.DoWork();
    /// </code>
    /// </example>
    public static IServiceScope CreateAuthenticatedScope(
        this IServiceScopeFactory factory,
        IDeveloperContextAccessor developerContextAccessor,
        string username,
        string? givenName = null,
        string? familyName = null)
    {
        developerContextAccessor.DeveloperContext = new DeveloperContext(username, givenName, familyName);
        return factory.CreateScope();
    }
}
