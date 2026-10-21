using System.Diagnostics.CodeAnalysis;
using Azure;
using Azure.Core;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

internal sealed class StubLogsQueryClient(
    IReadOnlyList<LogsTableColumn> columns,
    Func<string, IReadOnlyList<LogsTableRow>> rowsForQuery
) : LogsQueryClient
{
    public List<string> Queries { get; } = [];
    public List<LogsQueryTimeRange> TimeRanges { get; } = [];

    public override Task<Response<LogsQueryResult>> QueryResourceAsync(
        ResourceIdentifier resourceId,
        string query,
        LogsQueryTimeRange timeRange,
        LogsQueryOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        Queries.Add(query);
        TimeRanges.Add(timeRange);
        var rows = rowsForQuery(query);
        using var response = new EmptyResponse();
        var result = LogsQueryModelFactory.LogsQueryResult(
            [LogsQueryModelFactory.LogsTable("PrimaryResult", columns, rows)],
            error: BinaryData.FromString("null"),
            statistics: BinaryData.FromString("{}"),
            visualization: BinaryData.FromString("{}")
        );
        return Task.FromResult(Response.FromValue(result, response));
    }
}

file sealed class EmptyResponse : Response
{
    public override int Status => 200;
    public override string ReasonPhrase => "OK";
    public override Stream? ContentStream { get; set; }
    public override string ClientRequestId { get; set; } = "";

    public override void Dispose() { }

    protected override bool ContainsHeader(string name) => false;

    protected override IEnumerable<HttpHeader> EnumerateHeaders() => [];

    protected override bool TryGetHeader(string name, [NotNullWhen(true)] out string? value)
    {
        value = null;
        return false;
    }

    protected override bool TryGetHeaderValues(string name, [NotNullWhen(true)] out IEnumerable<string>? values)
    {
        values = null;
        return false;
    }
}
