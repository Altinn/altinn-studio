using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Repository;

// EFCore deals with nullable props appropriately
#pragma warning disable CS8604
#pragma warning disable CS8602

internal static class EngineRepositoryQueryExtensions
{
    extension(EngineDbContext dbContext)
    {
        public IQueryable<WorkflowEntity> GetActiveWorkflows(
            bool includeDependencies = true,
            bool includeLinks = true,
            Guid? correlationIdFilter = null,
            string? namespaceFilter = null,
            IReadOnlyDictionary<string, string>? labelFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: includeDependencies, links: includeLinks)
                .MaybeFilterByCorrelationId(correlationIdFilter)
                .MaybeFilterByNamespace(namespaceFilter)
                .MaybeFilterByLabels(labelFilter)
                .Where(wf => PersistentItemStatusMap.Incomplete.Contains(wf.Status))
                .Where(wf => wf.StartAt == null || wf.StartAt <= DateTime.UtcNow)
                .Where(wf => wf.Steps.Any(step => PersistentItemStatusMap.Incomplete.Contains(step.Status)));

        public IQueryable<WorkflowEntity> GetScheduledWorkflows(
            bool includeLinks = true,
            Guid? correlationIdFilter = null,
            string? namespaceFilter = null,
            IReadOnlyDictionary<string, string>? labelFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(steps: true, dependencies: true, links: includeLinks)
                .MaybeFilterByCorrelationId(correlationIdFilter)
                .MaybeFilterByNamespace(namespaceFilter)
                .MaybeFilterByLabels(labelFilter)
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
            Guid? correlationIdFilter = null,
            string? namespaceFilter = null,
            IReadOnlyDictionary<string, string>? labelFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(
                    steps: includeSteps,
                    dependencies: includeDependencies,
                    links: includeLinks
                )
                .MaybeFilterByCorrelationId(correlationIdFilter)
                .MaybeFilterByNamespace(namespaceFilter)
                .MaybeFilterByLabels(labelFilter)
                .Where(wf => PersistentItemStatusMap.Failed.Contains(wf.Status));

        public IQueryable<WorkflowEntity> GetSuccessfulWorkflows(
            bool includeSteps = true,
            bool includeDependencies = true,
            bool includeLinks = true,
            Guid? correlationIdFilter = null,
            string? namespaceFilter = null,
            IReadOnlyDictionary<string, string>? labelFilter = null
        ) =>
            dbContext
                .Workflows.IncludeRelatedEntities(
                    steps: includeSteps,
                    dependencies: includeDependencies,
                    links: includeLinks
                )
                .MaybeFilterByCorrelationId(correlationIdFilter)
                .MaybeFilterByNamespace(namespaceFilter)
                .MaybeFilterByLabels(labelFilter)
                .Where(wf => PersistentItemStatusMap.Successful.Contains(wf.Status));

        public IQueryable<WorkflowEntity> GetFinishedWorkflows(
            IReadOnlyList<PersistentItemStatus> statuses,
            string? search = null,
            int? take = null,
            DateTimeOffset? before = null,
            DateTimeOffset? since = null,
            bool retriedOnly = false,
            Guid? correlationIdFilter = null,
            string? namespaceFilter = null,
            IReadOnlyDictionary<string, string>? labelFilter = null
        )
        {
            var query = dbContext
                .Workflows.Include(j => j.Steps)
                .MaybeFilterByNamespace(namespaceFilter)
                .MaybeFilterByLabels(labelFilter)
                .MaybeFilterByCorrelationId(correlationIdFilter)
                .Where(x => statuses.Contains(x.Status));

            if (before.HasValue)
                query = query.Where(x => x.UpdatedAt < before.Value);

            if (since.HasValue)
                query = query.Where(x => x.UpdatedAt >= since.Value);

            if (retriedOnly)
                query = query.Where(x => x.Steps.Any(s => s.RequeueCount > 0));

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(x =>
                    EF.Functions.ILike(x.Namespace, $"%{search}%")
                    || EF.Functions.ILike(x.OperationId, $"%{search}%")
                    || x.Steps.Any(st => EF.Functions.ILike(st.OperationId, $"%{search}%"))
                    || (x.CorrelationId.HasValue && x.CorrelationId.Value.ToString().Contains(search))
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

        private IQueryable<WorkflowEntity> MaybeFilterByNamespace(string? ns)
        {
            if (ns is not null)
                entityQuery = entityQuery.Where(wf => wf.Namespace == WorkflowNamespace.Normalize(ns));

            return entityQuery;
        }

        private IQueryable<WorkflowEntity> MaybeFilterByCorrelationId(Guid? correlationId)
        {
            if (correlationId is not null)
                entityQuery = entityQuery.Where(wf => wf.CorrelationId == correlationId.Value);

            return entityQuery;
        }

        private IQueryable<WorkflowEntity> MaybeFilterByLabels(IReadOnlyDictionary<string, string>? labels)
        {
            if (labels is null)
                return entityQuery;

            foreach (var (key, value) in labels)
            {
                var filter = JsonSerializer.Serialize(new Dictionary<string, string> { [key] = value });
                entityQuery = entityQuery.Where(wf =>
                    wf.Labels != null && EF.Functions.JsonContains(wf.Labels, filter)
                );
            }

            return entityQuery;
        }
    }

    extension(IQueryable<StepEntity> entityQuery)
    {
        public IQueryable<Step> ToDomainModel() => entityQuery.Select(step => step.ToDomainModel());
    }
}
