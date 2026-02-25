using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal partial class EnginePgRepository
{
    private async Task<Workflow> AddWorkflowUnconstrained(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflowUnconstrained");

        try
        {
            var (workflow, entity) = await InsertWorkflowEntity(request, metadata, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.SuccessfullyAddedWorkflow(workflow);
            return entity.ToDomainModel();
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    private async Task<Workflow> AddWorkflowConstrained(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflowConstrained");

        try
        {
            var instanceGuid = metadata.InstanceInformation.InstanceGuid;
            var lockKey = GetAdvisoryLockKey(instanceGuid, request.Type);
            await using var dbLock = await AdvisoryLockScope.Acquire(
                lockKey,
                _context.Database.GetDbConnection(),
                cancellationToken
            );

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            // Insert the workflow + dependencies (flush so the stored function can see them)
            var (workflow, entity) = await InsertWorkflowEntity(request, metadata, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // Check the active workflow constraint via stored function
            var violation = await CheckActiveWorkflowConstraint(
                workflowId: entity.Id,
                workflowType: request.Type,
                instanceGuid,
                cancellationToken
            );

            if (violation is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw new EngineWorkflowConcurrencyException(
                    request.Type,
                    violation.RejectionReason,
                    violation.BlockingWorkflowId
                );
            }

            await transaction.CommitAsync(cancellationToken);

            _logger.SuccessfullyAddedWorkflow(workflow);
            return entity.ToDomainModel();
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }

        static long GetAdvisoryLockKey(Guid instanceGuid, WorkflowType workflowType)
        {
            long guidHash = instanceGuid.GetHashCode();
            return (guidHash << 32) | (uint)workflowType;
        }
    }

    private async Task<(Workflow workflow, WorkflowEntity entity)> InsertWorkflowEntity(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken,
        IReadOnlyList<WorkflowEntity>? preFetchedDependencies = null,
        IReadOnlyList<WorkflowEntity>? preFetchedLinks = null
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.InsertWorkflowEntity");

        try
        {
            var instanceGuid = metadata.InstanceInformation.InstanceGuid;

            // Resolve and validate dependencies
            List<WorkflowEntity>? dependencyEntities = preFetchedDependencies?.ToList();
            if (dependencyEntities is null && request.DependsOn?.Any() is true)
            {
                var depIds = request.DependsOn.Where(r => r.IsId).Select(r => r.Id).ToList();
                dependencyEntities = await _context
                    .Workflows.Where(x => depIds.Contains(x.Id) && x.InstanceGuid == instanceGuid)
                    .ToListAsync(cancellationToken);

                if (dependencyEntities.Count != request.DependsOn.Count())
                    throw new EngineDbException(
                        $"Not all specified Workflow dependencies could be found in the database: {string.Join(", ", request.DependsOn)}"
                    );
            }

            // Resolve and validate links
            List<WorkflowEntity>? linkEntities = preFetchedLinks?.ToList();
            if (linkEntities is null && request.Links?.Any() is true)
            {
                var linkIds = request.Links.Where(r => r.IsId).Select(r => r.Id).ToList();
                linkEntities = await _context
                    .Workflows.Where(x => linkIds.Contains(x.Id) && x.InstanceGuid == instanceGuid)
                    .ToListAsync(cancellationToken);

                if (linkEntities.Count != request.Links.Count())
                    throw new EngineDbException(
                        $"Not all specified Workflow links could be found in the database: {string.Join(", ", request.Links)}"
                    );
            }

            var workflow = Workflow.FromRequest(
                request,
                metadata,
                dependencies: dependencyEntities?.Select(x => x.ToDomainModel()).ToList(),
                links: linkEntities?.Select(x => x.ToDomainModel()).ToList()
            );
            var entity = WorkflowEntity.FromDomainModel(workflow);

            // Use already-tracked entities to avoid EF trying to re-insert them
            entity.Dependencies = dependencyEntities;
            entity.Links = linkEntities;

            await _context.Workflows.AddAsync(entity, cancellationToken);

            return (workflow, entity);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    /// <summary>
    /// Resolves a mixed list of <see cref="WorkflowRef"/> entries into <see cref="WorkflowEntity"/> instances.
    /// Ref-type entries are resolved from the within-batch <paramref name="refToEntity"/> map;
    /// ID-type entries are fetched from the database.
    /// </summary>
    private async Task<List<WorkflowEntity>?> ResolveWorkflowRefs(
        IEnumerable<WorkflowRef>? refs,
        Dictionary<string, WorkflowEntity> refToEntity,
        string roleLabel,
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        if (refs is null)
            return null;

        var refList = refs.ToList();
        if (refList.Count == 0)
            return null;

        var result = new List<WorkflowEntity>(refList.Count);

        var externalIds = refList.Where(r => r.IsId).Select(r => r.Id).ToList();
        if (externalIds.Count > 0)
        {
            var fetched = await _context
                .Workflows.Where(x => externalIds.Contains(x.Id) && x.InstanceGuid == instanceGuid)
                .ToListAsync(cancellationToken);

            if (fetched.Count != externalIds.Count)
                throw new EngineDbException(
                    $"Not all specified external {roleLabel}s could be found in the database: {string.Join(", ", externalIds)}"
                );

            result.AddRange(fetched);
        }

        foreach (var r in refList.Where(r => r.IsRef))
        {
            if (!refToEntity.TryGetValue(r.Ref, out var entity))
                throw new EngineDbException(
                    $"Within-batch {roleLabel} ref '{r.Ref}' not found. Batch must be in topological order."
                );
            result.Add(entity);
        }

        return result.Count > 0 ? result : null;
    }

    // TODO: If using this, we must also invalidate in-memory representations of the same records
    internal async Task<int> CascadeDependencyFailures(CancellationToken cancellationToken) =>
        await _context
            .Database.SqlQueryRaw<int>("SELECT cascade_dependency_failures() AS \"Value\"")
            .SingleAsync(cancellationToken);

    internal async Task<ConstraintCheckResult?> CheckActiveWorkflowConstraint(
        long workflowId,
        WorkflowType workflowType,
        Guid instanceGuid,
        CancellationToken cancellationToken
    ) =>
        await _context
            .Database.SqlQueryRaw<ConstraintCheckResult>(
                "SELECT rejection_reason AS \"RejectionReason\", blocking_workflow_id AS \"BlockingWorkflowId\" "
                    + "FROM check_active_workflow_constraint({0}, {1}, {2})",
                workflowId,
                (int)workflowType,
                instanceGuid
            )
            .SingleOrDefaultAsync(cancellationToken);

    internal sealed record ConstraintCheckResult(string RejectionReason, long BlockingWorkflowId);
}
