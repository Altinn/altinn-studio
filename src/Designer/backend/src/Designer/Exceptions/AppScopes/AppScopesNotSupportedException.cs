using System;

namespace Altinn.Studio.Designer.Exceptions.AppScopes;

public sealed class AppScopesNotSupportedException(string org)
    : Exception(
        $"Maskinporten scopes are only supported for service-owner organisations. '{org}' is not a service-owner organisation."
    );
