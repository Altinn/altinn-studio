using System.Text.Json;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Utils;

/// <summary>
/// Workflow and step request validation utilities.
/// </summary>
internal static class ValidationUtils
{
    /// <summary>
    /// Validates and sorts a collection of workflow requests using Kahn's algorithm.
    /// Returns the requests in topological order (dependencies first).
    /// </summary>
    /// <exception cref="ArgumentException">
    /// Thrown when refs are not unique, a <c>DependsOn</c> ref is not present in the batch,
    /// a workflow references itself, or a dependency cycle is detected.
    /// </exception>
    public static IReadOnlyList<WorkflowRequest> ValidateAndSortWorkflowGraph(IReadOnlyList<WorkflowRequest> requests)
    {
        using var activity = Metrics.Source.StartActivity("ValidationUtils.ValidateAndSortWorkflowGraph");

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

        // Kahn's algorithm
        var queue = new Queue<int>();
        for (int i = 0; i < requests.Count; i++)
        {
            if (inDegree[i] == 0)
                queue.Enqueue(i);
        }

        var sorted = new List<WorkflowRequest>(requests.Count);
        while (queue.Count > 0)
        {
            int idx = queue.Dequeue();
            sorted.Add(requests[idx]);

            foreach (int dependentIdx in dependents[idx])
            {
                inDegree[dependentIdx]--;
                if (inDegree[dependentIdx] == 0)
                    queue.Enqueue(dependentIdx);
            }
        }

        if (sorted.Count != requests.Count)
        {
            // Find the refs involved in the cycle for a helpful error message
            var cycleRefs = requests.Where((_, i) => inDegree[i] > 0).Select((r, i) => WorkflowLabel(r, i)).ToList();

            throw new ArgumentException(
                $"Dependency cycle detected in batch involving refs: {string.Join(", ", cycleRefs)}"
            );
        }

        return sorted;
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

        if (!IsValidJsonOrNull(request.Metadata))
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

        if (!IsValidJsonOrNull(request.Metadata))
            return false;

        return true;
    }

    private static bool IsValidJsonOrNull(string? json)
    {
        if (json is null)
            return true;

        try
        {
            using var doc = JsonDocument.Parse(json);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
