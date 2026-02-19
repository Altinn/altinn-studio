using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Infrastructure.DeveloperSession;

public static class ServiceScopeExtensions
{
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
