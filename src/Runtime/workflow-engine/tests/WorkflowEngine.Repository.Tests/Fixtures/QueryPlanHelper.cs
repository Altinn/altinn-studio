using System.Text.Json;
using Npgsql;

namespace WorkflowEngine.Repository.Tests.Fixtures;

/// <summary>
/// Utility for running EXPLAIN (FORMAT JSON) on SQL queries and asserting on the resulting plan nodes.
/// Uses plain EXPLAIN (not ANALYZE) so DML queries are planned but not executed.
/// All EXPLAIN queries run with <c>enable_seqscan = off</c> to force the planner to use indexes
/// where they exist, regardless of table size. This lets us detect missing indexes even on small
/// test datasets where Postgres would otherwise (correctly) prefer Seq Scans.
/// </summary>
internal static class QueryPlanHelper
{
    /// <summary>
    /// Runs EXPLAIN (FORMAT JSON) for the given SQL and returns the parsed JSON plan.
    /// Parameters from <paramref name="capturedQuery"/> are bound to the EXPLAIN command.
    /// </summary>
    public static async Task<JsonElement> ExplainAsync(
        NpgsqlDataSource dataSource,
        CapturedQuery capturedQuery,
        CancellationToken ct = default
    )
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);

        // Force index usage so we detect missing indexes even on small tables
        await using (var setCmd = new NpgsqlCommand("SET enable_seqscan = off", conn))
        {
            await setCmd.ExecuteNonQueryAsync(ct);
        }

        var explainSql = $"EXPLAIN (FORMAT JSON) {capturedQuery.Sql}";
        await using var cmd = new NpgsqlCommand(explainSql, conn);

        foreach (var (name, value) in capturedQuery.Parameters)
        {
            cmd.Parameters.AddWithValue(name, value ?? DBNull.Value);
        }

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        var json = reader.GetString(0);

        return JsonDocument.Parse(json).RootElement;
    }

    /// <summary>
    /// Runs EXPLAIN (FORMAT JSON) for a raw SQL string with explicitly provided NpgsqlParameters.
    /// </summary>
    public static async Task<JsonElement> ExplainAsync(
        NpgsqlDataSource dataSource,
        string sql,
        NpgsqlParameter[]? parameters = null,
        CancellationToken ct = default
    )
    {
        await using var conn = await dataSource.OpenConnectionAsync(ct);

        // Force index usage so we detect missing indexes even on small tables
        await using (var setCmd = new NpgsqlCommand("SET enable_seqscan = off", conn))
        {
            await setCmd.ExecuteNonQueryAsync(ct);
        }

        var explainSql = $"EXPLAIN (FORMAT JSON) {sql}";
        await using var cmd = new NpgsqlCommand(explainSql, conn);

        if (parameters is not null)
        {
            foreach (var p in parameters)
                cmd.Parameters.Add(p);
        }

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        var json = reader.GetString(0);

        return JsonDocument.Parse(json).RootElement;
    }

    /// <summary>
    /// Recursively collects all plan node types from an EXPLAIN JSON result.
    /// </summary>
    public static List<PlanNode> GetAllNodes(JsonElement plan)
    {
        var nodes = new List<PlanNode>();
        var root = plan[0].GetProperty("Plan");
        CollectNodes(root, nodes);
        return nodes;
    }

    /// <summary>
    /// Returns all plan nodes that reference the given table (via "Relation Name").
    /// </summary>
    public static List<PlanNode> GetScanNodes(JsonElement plan, string tableName)
    {
        return GetAllNodes(plan).Where(n => n.RelationName == tableName).ToList();
    }

    /// <summary>
    /// Asserts that no Seq Scan node exists for the given table in the plan.
    /// Throws with a descriptive message if a Seq Scan is found.
    /// </summary>
    public static void AssertNoSeqScan(JsonElement plan, string tableName)
    {
        var scanNodes = GetScanNodes(plan, tableName);
        var seqScans = scanNodes.Where(n => n.NodeType == "Seq Scan").ToList();

        if (seqScans.Count > 0)
        {
            var allNodeTypes = string.Join(", ", scanNodes.Select(n => n.NodeType));
            throw new Xunit.Sdk.XunitException(
                $"Expected no Seq Scan on \"{tableName}\" but found {seqScans.Count}. "
                    + $"All scan types on this table: [{allNodeTypes}]"
            );
        }
    }

    /// <summary>
    /// Asserts that at least one node for the given table uses one of the expected scan types.
    /// </summary>
    public static void AssertHasScanType(JsonElement plan, string tableName, params string[] expectedTypes)
    {
        var scanNodes = GetScanNodes(plan, tableName);
        var matching = scanNodes.Where(n => expectedTypes.Contains(n.NodeType)).ToList();

        if (matching.Count == 0)
        {
            var allNodeTypes = string.Join(", ", scanNodes.Select(n => n.NodeType));
            var expected = string.Join(" or ", expectedTypes);
            throw new Xunit.Sdk.XunitException(
                $"Expected {expected} on \"{tableName}\" but found none. " + $"Actual scan types: [{allNodeTypes}]"
            );
        }
    }

    private static void CollectNodes(JsonElement node, List<PlanNode> nodes)
    {
        var nodeType = node.GetProperty("Node Type").GetString()!;
        string? relationName = null;
        if (node.TryGetProperty("Relation Name", out var rel))
            relationName = rel.GetString();

        string? indexName = null;
        if (node.TryGetProperty("Index Name", out var idx))
            indexName = idx.GetString();

        nodes.Add(new PlanNode(nodeType, relationName, indexName));

        if (node.TryGetProperty("Plans", out var plans))
        {
            foreach (var child in plans.EnumerateArray())
            {
                CollectNodes(child, nodes);
            }
        }
    }
}

internal sealed record PlanNode(string NodeType, string? RelationName, string? IndexName);
