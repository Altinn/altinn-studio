#pragma warning disable CA2100 // Test-only SQL from trusted source

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

    /// <summary>
    /// Asserts that at least one Index Scan (or Index Only Scan) node on the given table uses the
    /// named index. Stronger than <see cref="AssertNoSeqScan"/>: a plan that degrades to a bitmap
    /// scan over a different index still fails, which is how a partial-index filter falling out of
    /// sync with its query predicate gets caught.
    /// </summary>
    public static void AssertUsesIndexScan(JsonElement plan, string tableName, string indexName)
    {
        var scanNodes = GetScanNodes(plan, tableName);
        var matching = scanNodes
            .Where(n => n.NodeType is "Index Scan" or "Index Only Scan" && n.IndexName == indexName)
            .ToList();

        if (matching.Count == 0)
        {
            var actual = string.Join(", ", scanNodes.Select(n => $"{n.NodeType}({n.IndexName ?? "-"})"));
            throw new Xunit.Sdk.XunitException(
                $"Expected an Index Scan using \"{indexName}\" on \"{tableName}\" but found none. "
                    + $"Actual scans on this table: [{actual}]"
            );
        }
    }

    /// <summary>
    /// Bitmap-tolerant sibling of <see cref="AssertUsesIndexScan"/>: a query with no matching <c>ORDER BY</c>
    /// is answered with a Bitmap Index Scan, whose nodes carry the index name but no relation name — so the
    /// index and the table's scan nodes are checked separately.
    /// </summary>
    public static void AssertUsesIndex(JsonElement plan, string tableName, string indexName)
    {
        AssertNoSeqScan(plan, tableName);

        var nodes = GetAllNodes(plan);
        if (!nodes.Any(n => n.IndexName == indexName))
        {
            var actual = string.Join(
                ", ",
                nodes.Where(n => n.IndexName is not null).Select(n => $"{n.NodeType}({n.IndexName})")
            );
            throw new Xunit.Sdk.XunitException(
                $"Expected the plan to read \"{indexName}\" but it does not. Indexes read: [{actual}]"
            );
        }
    }

    /// <summary>
    /// Asserts that some node reading <paramref name="indexName"/> carries an <c>Index Cond</c> mentioning every
    /// one of <paramref name="fragments"/>. Stronger than the index-name assertions: a column that only appears
    /// in a node's <c>Filter</c> narrows nothing, so the scan reads every row the remaining columns match. Name
    /// the join alias in a fragment when several scans share an index.
    /// </summary>
    public static void AssertIndexCondContains(JsonElement plan, string indexName, params string[] fragments)
    {
        var candidates = GetAllNodes(plan).Where(n => n.IndexName == indexName).ToList();
        var matching = candidates
            .Where(n =>
                n.IndexCond is not null && fragments.All(f => n.IndexCond.Contains(f, StringComparison.Ordinal))
            )
            .ToList();

        if (matching.Count == 0)
        {
            var expected = string.Join(" and ", fragments);
            var actual = string.Join(", ", candidates.Select(n => $"{n.NodeType}: {n.IndexCond ?? "-"}"));
            throw new Xunit.Sdk.XunitException(
                $"Expected a scan of \"{indexName}\" whose Index Cond mentions {expected} but found none. "
                    + $"Index Conds on this index: [{actual}]"
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

        string? indexCond = null;
        if (node.TryGetProperty("Index Cond", out var cond))
            indexCond = cond.GetString();

        nodes.Add(new PlanNode(nodeType, relationName, indexName, indexCond));

        if (node.TryGetProperty("Plans", out var plans))
        {
            foreach (var child in plans.EnumerateArray())
            {
                CollectNodes(child, nodes);
            }
        }
    }
}

internal sealed record PlanNode(string NodeType, string? RelationName, string? IndexName, string? IndexCond);
