using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Core.Features.Auth;

internal static class AuthenticationContextDI
{
    internal static void AddAuthenticationContext(this IServiceCollection services)
    {
        services.TryAddSingleton<IAuthenticationContext, AuthenticationContext>();
    }
}
