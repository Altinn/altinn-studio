using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Storage refused a workflow step's save that carried a <c>callerResult</c> and went out with an overridden
/// authentication method, because a data type the step changed was overridden to that method.
/// </summary>
internal sealed class InstanceMutationCallerResultForbiddenException : Exception
{
    public InstanceMutationCallerResultForbiddenException(
        StorageAuthenticationMethod authenticationMethod,
        PlatformHttpException innerException
    )
        : base(
            $"Storage refused the step's save with 403 Forbidden. The save carries the step's result, which Storage "
                + "refuses from a token that does not carry the organization that owns the instance, and it went out "
                + $"with {Describe(authenticationMethod)}, because the step changed a data type that "
                + "IInstanceDataAccessor.OverrideAuthenticationMethod set to that method. Remove the override, or "
                + "have it use a token that carries that organization.",
            innerException
        ) { }

    private static string Describe(StorageAuthenticationMethod authenticationMethod) =>
        authenticationMethod.Request switch
        {
            AuthenticationMethod.UserToken => "the current user's token",
            AuthenticationMethod.CustomToken => "a custom token",
            _ => authenticationMethod.Request.GetType().Name,
        };
}
