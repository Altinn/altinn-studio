namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient;

/// <summary>
/// Activity signal categories, exposed as-is in the public API.
/// </summary>
internal static class AppActivitySignalCategory
{
    public const string Read = "read";
    public const string Write = "write";
}

/// <summary>
/// KQL query classifying app requests into activity signal categories.
/// </summary>
internal static class AppActivitySignalQueries
{
    // A request is a write when it uses a mutating method and was not rejected with a 4xx; everything else is a read.
    // Request names start with the method for both Application Insights SDK ("POST Instances/Post [app/org]")
    // and OpenTelemetry ("POST {org}/{app}/instances", or just "GET" for unrouted requests).
    // Requests are counted with sum(ItemCount) to compensate for sampling.
    internal static string BuildQuery(int windowDays)
    {
        return $$"""
            AppRequests
            | where TimeGenerated > ago({{windowDays}}d)
            | extend Method = toupper(tostring(split(Name, ' ')[0]))
            | extend IsClientError = coalesce(toint(ResultCode) between (400 .. 499), false)
            | extend Category = iff(Method in ('POST', 'PUT', 'PATCH', 'DELETE') and not(IsClientError), '{{AppActivitySignalCategory.Write}}', '{{AppActivitySignalCategory.Read}}')
            | summarize Count = todouble(sum(ItemCount)), LastSeenAt = max(TimeGenerated) by AppRoleName, Category
            """;
    }
}
