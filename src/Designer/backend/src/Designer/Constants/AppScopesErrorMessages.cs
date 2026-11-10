using System.Collections.Generic;

namespace Altinn.Studio.Designer.Constants;

public static class AppScopesErrorMessages
{
    public const string NotSupportedTitle = "Maskinporten scopes are not supported for this app";

    public static string NotSupportedDetail(string org) =>
        $"Maskinporten scopes are only supported for service-owner organizations. '{org}' is not a service-owner organization.";

    public const string ScopesNotAvailableTitle = "Maskinporten scopes are not available";

    public static string ScopesNotAvailableDetail(IEnumerable<string> scopeNames) =>
        $"The following scopes are not available to the organization: {string.Join(", ", scopeNames)}.";
}
