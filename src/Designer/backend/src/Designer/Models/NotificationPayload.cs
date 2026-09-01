using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

public sealed record NotificationPayload(
    string Id,
    string Title,
    IReadOnlyList<(string Label, string Value)> Fields,
    IReadOnlyList<(string Url, string Label)> Links,
    string Body = "",
    string Emoji = ""
);
