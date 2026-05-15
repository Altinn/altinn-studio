using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Utils;

/// <summary>
/// Workflow and step request validation utilities.
/// </summary>
internal static class ValidationUtils
{
    /// <summary>
    /// Validates the workflow batch graph: ref uniqueness, self-references, unresolved
    /// <c>DependsOn</c> refs, and dependency cycles. Cycle detection runs Kahn's algorithm
    /// for its acyclicity check; the topological ordering it produces is not surfaced because
    /// persistence and the API response both key off request order.
    /// </summary>
    /// <exception cref="ArgumentException">
    /// Thrown when refs are not unique, a <c>DependsOn</c> ref is not present in the batch,
    /// a workflow references itself, or a dependency cycle is detected.
    /// </exception>
    public static void ValidateWorkflowGraph(IReadOnlyList<WorkflowRequest> requests)
    {
        using var activity = Metrics.Source.StartActivity("ValidationUtils.ValidateWorkflowGraph");

        // Build ref -> index map (only for workflows that have a ref) and validate uniqueness
        var refToIndex = new Dictionary<string, int>(requests.Count);
        for (int i = 0; i < requests.Count; i++)
        {
            var req = requests[i];

            if (!IsValidWorkflowRequest(req))
                throw new ArgumentException($"Workflow at index {i} ({WorkflowLabel(req, i)}) is invalid.");

            if (req.Ref is not null && !refToIndex.TryAdd(req.Ref, i))
                throw new ArgumentException($"Duplicate ref '{req.Ref}' in batch.");
        }

        // Build adjacency list (edges: dependency -> dependent)
        // and in-degree map for Kahn's algorithm
        var inDegree = new int[requests.Count];
        var dependents = new List<int>[requests.Count];
        for (int i = 0; i < requests.Count; i++)
            dependents[i] = [];

        for (int i = 0; i < requests.Count; i++)
        {
            var req = requests[i];
            if (req.DependsOn is null)
                continue;

            foreach (var dep in req.DependsOn)
            {
                // If the dependency is a db id, skip calculation.
                if (dep.IsId)
                    continue;

                var depRef = dep.Ref;

                if (depRef == req.Ref)
                    throw new ArgumentException(
                        $"Workflow '{WorkflowLabel(req, i)}' has a self-reference in DependsOn."
                    );

                if (!refToIndex.TryGetValue(depRef, out int depIdx))
                    throw new ArgumentException(
                        $"DependsOn ref '{depRef}' in workflow '{WorkflowLabel(req, i)}' is not present in the batch."
                    );

                dependents[depIdx].Add(i);
                inDegree[i]++;
            }
        }

        // Kahn's algorithm — used purely for cycle detection. A complete topological pass
        // visits every node exactly once; if `processed` falls short, the unvisited nodes
        // form (or feed into) at least one cycle.
        var queue = new Queue<int>();
        for (int i = 0; i < requests.Count; i++)
        {
            if (inDegree[i] == 0)
                queue.Enqueue(i);
        }

        int processed = 0;
        while (queue.Count > 0)
        {
            int idx = queue.Dequeue();
            processed++;

            foreach (int dependentIdx in dependents[idx])
            {
                inDegree[dependentIdx]--;
                if (inDegree[dependentIdx] == 0)
                    queue.Enqueue(dependentIdx);
            }
        }

        if (processed != requests.Count)
        {
            var cycleRefs = Enumerable
                .Range(0, requests.Count)
                .Where(i => inDegree[i] > 0)
                .Select(i => WorkflowLabel(requests[i], i))
                .ToList();

            throw new ArgumentException(
                $"Dependency cycle detected in batch involving refs: {string.Join(", ", cycleRefs)}"
            );
        }
    }

    /// <summary>
    /// Returns a human-readable label for a workflow request, preferring Ref if available, falling back to index.
    /// </summary>
    private static string WorkflowLabel(WorkflowRequest req, int index) => req.Ref ?? $"#{index}";

    /// <summary>
    /// Basic validation for a workflow request.
    /// </summary>
    public static bool IsValidWorkflowRequest(WorkflowRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OperationId))
            return false;

        return request.Steps.Any() && request.Steps.All(IsValidStepRequest);
    }

    /// <summary>
    /// Basic validation for a step request.
    /// </summary>
    public static bool IsValidStepRequest(StepRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Command.Type))
            return false;

        if (string.IsNullOrWhiteSpace(request.OperationId))
            return false;

        return true;
    }
}
