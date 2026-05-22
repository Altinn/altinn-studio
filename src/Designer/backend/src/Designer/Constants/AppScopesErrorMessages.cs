namespace Altinn.Studio.Designer.Constants;

public static class AppScopesErrorMessages
{
    public const string NotSupportedTitle = "Maskinporten scopes are not supported for this app";

    public static string NotSupportedDetail(string org) =>
        $"Maskinporten scopes are only supported for service-owner organisations. '{org}' is not a service-owner organisation.";
}
