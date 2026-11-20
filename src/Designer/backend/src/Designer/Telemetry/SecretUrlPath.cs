using System;
using System.Diagnostics;
using System.Net.Http;

namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// Keeps URL paths that carry a secret, such as a Slack webhook's, out of client spans.
/// The HTTP client instrumentation only redacts query strings.
/// </summary>
internal static class SecretUrlPath
{
    private const string RedactedPath = "/REDACTED";

    private static readonly HttpRequestOptionsKey<bool> s_key = new("altinn.designer.secret_url_path");

    public static void MarkSecretUrlPath(this HttpRequestMessage request) => request.Options.Set(s_key, true);

    public static void Redact(Activity activity, HttpRequestMessage request)
    {
        if (request.Options.TryGetValue(s_key, out bool isSecret) && isSecret && request.RequestUri is { } uri)
        {
            activity.SetTag(
                ServiceTelemetry.Attributes.UrlFull,
                uri.GetComponents(UriComponents.SchemeAndServer, UriFormat.UriEscaped) + RedactedPath
            );
        }
    }
}
