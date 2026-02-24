using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

// EFCore deals with nullable Dependencies prop appropriately
#pragma warning disable CS8604

internal static class EnginePgRepositoryQueries
{
    private static List<PersistentItemStatus> _incompleteItemStatuses =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

    private static List<PersistentItemStatus> _failedItemStatuses =>
        [PersistentItemStatus.Requeued, PersistentItemStatus.Failed, PersistentItemStatus.DependencyFailed];

    extension(EngineDbContext dbContext)
    {
        public IQueryable<WorkflowEntity> GetActiveWorkflows(
            bool includeDependencies = true,
            bool includeLinks = true
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: includeDependencies, links: includeLinks)
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetScheduledWorkflows(bool includeLinks = true) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: true, links: includeLinks)
                .Where(x =>
                    x.StartAt > DateTime.UtcNow || x.Dependencies.Any(y => _incompleteItemStatuses.Contains(y.Status))
                )
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetFailedWorkflows(
            bool includeSteps = true,
            bool includeDependencies = true,
            bool includeLinks = true
        ) =>
            dbContext
                .Workflows.Where(x => _failedItemStatuses.Contains(x.Status))
                .IncludeRelatedEntities(steps: includeSteps, dependencies: includeDependencies, links: includeLinks);

        public IQueryable<WorkflowEntity> GetActiveWorkflowsForInstance(
            Guid instanceGuid,
            bool includeDependencies = true,
            bool includeLinks = true
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: includeDependencies, links: includeLinks)
                .Where(x => x.InstanceGuid == instanceGuid)
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetWorkflowById(
            long workflowId,
            bool includeSteps = true,
            bool includeDependencies = true,
            bool includeLinks = true
        ) =>
            dbContext
                .Workflows.Where(x => x.Id == workflowId)
                .IncludeRelatedEntities(steps: includeSteps, dependencies: includeDependencies, links: includeLinks);
    }

    extension(IQueryable<WorkflowEntity> entityQuery)
    {
        public IQueryable<Workflow> ToDomainModel() => entityQuery.Select(x => x.ToDomainModel());

        private IQueryable<WorkflowEntity> IncludeRelatedEntities(
            bool steps = true,
            bool dependencies = true,
            bool links = true
        )
        {
            if (steps)
                entityQuery = entityQuery.Include(j => j.Steps);

            if (dependencies)
                entityQuery = entityQuery.Include(j => j.Dependencies);

            if (links)
                entityQuery = entityQuery.Include(j => j.Links);

            return entityQuery;
        }
    }

    extension(IQueryable<StepEntity> entityQuery)
    {
        public IQueryable<Step> ToDomainModel() => entityQuery.Select(x => x.ToDomainModel());
    }
}
