using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

// EFCore deals with nullable props appropriately
#pragma warning disable CS8604

internal static class EnginePgRepositoryQueries
{
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
                .Where(wf => PersistentItemStatusMap.Incomplete.Contains(wf.Status))
                .Where(wf => wf.StartAt == null || wf.StartAt <= DateTime.UtcNow)
                .Where(wf => wf.Steps.Any(step => PersistentItemStatusMap.Incomplete.Contains(step.Status)));

        public IQueryable<WorkflowEntity> GetScheduledWorkflows(
            bool includeLinks = true,
            Guid? instanceFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: true, links: includeLinks)
                .MaybeFilterByInstanceGuid(instanceFilter)
                .Where(wf => PersistentItemStatusMap.Incomplete.Contains(wf.Status))
                .Where(wf =>
                    wf.StartAt > DateTime.UtcNow
                    || wf.Dependencies.Any(dep => PersistentItemStatusMap.Incomplete.Contains(dep.Status))
                )
                .Where(wf => wf.Steps.Any(step => PersistentItemStatusMap.Incomplete.Contains(step.Status)));

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
                .Where(wf => PersistentItemStatusMap.Failed.Contains(wf.Status));

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
                .Where(wf => PersistentItemStatusMap.Successful.Contains(wf.Status));

        public IQueryable<WorkflowEntity> GetFinishedWorkflows(
            IReadOnlyList<PersistentItemStatus> statuses,
            string? search = null,
            int? take = null,
            DateTimeOffset? before = null,
            DateTimeOffset? since = null,
            bool retriedOnly = false,
            string? org = null,
            string? app = null,
            string? party = null,
            string? instanceGuid = null
        )
        {
            var query = dbContext.Workflows.Include(j => j.Steps).Where(x => statuses.Contains(x.Status));

            if (before.HasValue)
                query = query.Where(x => x.UpdatedAt < before.Value);

            if (since.HasValue)
                query = query.Where(x => x.UpdatedAt >= since.Value);

            if (retriedOnly)
                query = query.Where(x => x.Steps.Any(s => s.RequeueCount > 0));

            if (!string.IsNullOrWhiteSpace(org))
                query = query.Where(x => x.InstanceOrg == org);

            if (!string.IsNullOrWhiteSpace(app))
                query = query.Where(x => x.InstanceApp == app);

            if (!string.IsNullOrWhiteSpace(party))
                query = query.Where(x => x.InstanceOwnerPartyId.ToString() == party);

            if (!string.IsNullOrWhiteSpace(instanceGuid))
                query = query.Where(x => x.InstanceGuid.ToString() == instanceGuid);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(x =>
                    x.InstanceGuid.ToString().Contains(s)
                    || x.InstanceOrg.ToLower().Contains(s)
                    || x.InstanceApp.ToLower().Contains(s)
                    || x.OperationId.ToLower().Contains(s)
                    || x.InstanceOwnerPartyId.ToString().Contains(s)
                    || x.Steps.Any(st => st.OperationId.ToLower().Contains(s))
                );
            }

            query = query.OrderByDescending(x => x.UpdatedAt);

            if (take.HasValue)
                query = query.Take(take.Value);

            return query;
        }

        public IQueryable<WorkflowEntity> GetWorkflowById(
            Guid workflowId,
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
