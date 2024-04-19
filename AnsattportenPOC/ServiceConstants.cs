using Microsoft.AspNetCore.Authentication.Cookies;

namespace AnsattportenPOC;

internal static class ServiceConstants
{
    public static string AnsattportenAuthenticationScheme => "AnsattportenOidc";
    public static string AnsattportenAuthorizationPolicy => "AnsattportenAuth";
    public static string CookieScheme => CookieAuthenticationDefaults.AuthenticationScheme;

    public static class RequestParams
    {
        public static string AuthorizationDetails = "authorization_details";
        public static string AcrValues = "acr_values";
    }
}
