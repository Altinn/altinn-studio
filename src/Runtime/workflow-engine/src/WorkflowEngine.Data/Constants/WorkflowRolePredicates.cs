using System.Linq.Expressions;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

/// <summary>
/// The canonical <see cref="WorkflowRole"/> predicates, shared by every query that filters on role so
/// the definition cannot drift between sites. A workflow is <em>primary</em> unless its persisted
/// <c>isHead</c> directive is exactly <c>false</c>: the default directive is <c>null</c>, so primary is
/// <c>is_head IS DISTINCT FROM false</c> (EF compiles the C# null semantics of <c>!= false</c> to that
/// shape), never <c>is_head = true</c>.
/// </summary>
/// <remarks>
/// Grouped-aggregate lambdas (e.g. the rollup's <c>COUNT(*) FILTER</c> conditions in
/// <c>EngineRepository.GetCollectionWorkflowCounts</c>) cannot compose an
/// <see cref="Expression"/>, so they restate the predicate inline with a comment pinning them
/// here; the collection-rollup integration test exercises a null-directive failure landing in the
/// primary bucket, which catches a desync.
/// </remarks>
internal static class WorkflowRolePredicates
{
    /// <summary>
    /// Primary: directive <c>true</c> or unset (<c>is_head IS DISTINCT FROM false</c>).
    /// </summary>
    public static readonly Expression<Func<WorkflowEntity, bool>> Primary = wf => wf.IsHead != false;

    /// <summary>
    /// Auxiliary: directive exactly <c>false</c> (<c>is_head = false</c>).
    /// </summary>
    public static readonly Expression<Func<WorkflowEntity, bool>> Auxiliary = wf => wf.IsHead == false;
}
