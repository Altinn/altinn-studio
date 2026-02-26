using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

// EFCore deals with nullable props appropriately
#pragma warning disable CS8604

internal static class EnginePgRepositoryQueries
{
    private static List<PersistentItemStatus> _incompleteItemStatuses =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

    private static List<PersistentItemStatus> _successItemStatuses => [PersistentItemStatus.Completed];

    private static List<PersistentItemStatus> _failedItemStatuses =>
        [PersistentItemStatus.Canceled, PersistentItemStatus.Failed, PersistentItemStatus.DependencyFailed];

    extension(EngineDbContext dbContext)
    {
        public IQueryable<WorkflowEntity> GetActiveWorkflows(
            bool includeDependencies = true,
            bool includeLinks = true,
            Guid? instanceFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: includeDependencies, links: includeLinks)
                .MaybeFilterByInstanceGuid(instanceFilter)
                .Where(wf => _incompleteItemStatuses.Contains(wf.Status))
                .Where(wf => wf.StartAt == null || wf.StartAt <= DateTime.UtcNow)
                .Where(wf => wf.Steps.Any(step => _incompleteItemStatuses.Contains(step.Status)));

        public IQueryable<WorkflowEntity> GetScheduledWorkflows(
            bool includeLinks = true,
            Guid? instanceFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: true, links: includeLinks)
                .MaybeFilterByInstanceGuid(instanceFilter)
                .Where(wf => _incompleteItemStatuses.Contains(wf.Status))
                .Where(wf => wf.StartAt > DateTime.UtcNow)
                .Where(wf => wf.Steps.Any(step => _incompleteItemStatuses.Contains(step.Status)));

        public IQueryable<WorkflowEntity> GetFailedWorkflows(
            bool includeSteps = true,
            bool includeDependencies = true,
            bool includeLinks = true,
            Guid? instanceFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(
                    steps: includeSteps,
                    dependencies: includeDependencies,
                    links: includeLinks
                )
                .MaybeFilterByInstanceGuid(instanceFilter)
                .Where(wf => _failedItemStatuses.Contains(wf.Status));

        public IQueryable<WorkflowEntity> GetSuccessfulWorkflows(
            bool includeSteps = true,
            bool includeDependencies = true,
            bool includeLinks = true,
            Guid? instanceFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(
                    steps: includeSteps,
                    dependencies: includeDependencies,
                    links: includeLinks
                )
                .MaybeFilterByInstanceGuid(instanceFilter)
                .Where(wf => _successItemStatuses.Contains(wf.Status));

        public IQueryable<WorkflowEntity> GetWorkflowById(
            long workflowId,
            bool includeSteps = true,
            bool includeDependencies = true,
            bool includeLinks = true
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(
                    steps: includeSteps,
                    dependencies: includeDependencies,
                    links: includeLinks
                )
                .Where(wf => wf.Id == workflowId);
    }

    extension(IQueryable<WorkflowEntity> entityQuery)
    {
        public IQueryable<Workflow> ToDomainModel() => entityQuery.Select(wf => wf.ToDomainModel());

        private IQueryable<WorkflowEntity> IncludeRelatedEntities(
            bool steps = true,
            bool dependencies = true,
            bool links = true
        )
        {
            if (steps)
                entityQuery = entityQuery.Include(wf => wf.Steps);

            if (dependencies)
                entityQuery = entityQuery.Include(wf => wf.Dependencies);

            if (links)
                entityQuery = entityQuery.Include(wf => wf.Links);

            return entityQuery.AsSplitQuery();
        }

        private IQueryable<WorkflowEntity> MaybeFilterByInstanceGuid(Guid? instanceGuid)
        {
            if (instanceGuid is not null)
                entityQuery = entityQuery.Where(wf => wf.InstanceGuid == instanceGuid.Value);

            return entityQuery;
        }
    }

    extension(IQueryable<StepEntity> entityQuery)
    {
        public IQueryable<Step> ToDomainModel() => entityQuery.Select(step => step.ToDomainModel());
    }
}
