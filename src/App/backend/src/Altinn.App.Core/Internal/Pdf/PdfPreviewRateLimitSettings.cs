namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// A limit on how many PDF previews the app generates in a time window, across all instances. Requests over the limit
/// get 429 Too Many Requests. The limit is kept in memory, so each running copy of the app counts its own previews.
/// </summary>
public class PdfPreviewRateLimitSettings
{
    /// <summary>
    /// The number of previews allowed in each window. Set to 0 to turn the limit off. Default is 20.
    /// </summary>
    public int PermitLimit { get; set; } = 20;

    /// <summary>
    /// The length of each window, such as "00:01:00" for one minute. Default is one minute.
    /// </summary>
    public TimeSpan Window { get; set; } = TimeSpan.FromMinutes(1);

    /// <summary>
    /// The number of requests over the limit that wait for the next window instead of getting 429. Default is 0.
    /// </summary>
    public int QueueLimit { get; set; }
}
