namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

/// <summary>
/// Notifications allow you to subscribe to status updates for a payment.
/// </summary>
internal class NetsNotifications
{
    /// <summary>
    /// The list of webhooks. The maximum number of webhooks is 32.
    /// </summary>
    public List<NetsWebHook>? WebHooks { get; set; }
}

internal class NetsWebHook
{
    /// <summary>
    /// The name of the event you want to subscribe to. See webhooks for the complete list of events.
    /// The following special characters are not supported: &lt;,&gt;,\,',”,&amp;,\\
    /// </summary>
    public string? EventName { get; set; }

    /// <summary>
    /// The callback is sent to this URL. Must be HTTPS to ensure a secure communication. Maximum allowed length of the URL is 256 characters.
    /// Whitelist: “[&amp;]” =&gt; “”
    /// The following special characters are not supported: &lt;,&gt;,\,',”,&amp;,\\
    /// Additional notes: HTTPS is not required
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// The credentials that will be sent in the HTTP Authorization request header of the callback. Must be between 8 and 32 characters long and contain alphanumeric characters.
    /// Length: 8-64
    /// Pattern: @^[a-zA-Z0-9\-= ]*$
    /// </summary>
    public string? Authorization { get; set; }
}
