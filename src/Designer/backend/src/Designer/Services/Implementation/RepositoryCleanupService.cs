using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation;

internal sealed class RepositoryCleanupService : IRepositoryCleanupService
{
    private readonly RepositoryCleanupSettings _settings;
    private readonly TimeProvider _timeProvider;
    private readonly RepositoryCleanupCandidateSource _candidateSource;
    private readonly RepositoryCleanupCandidateProcessor _candidateProcessor;

    public RepositoryCleanupService(
        SchedulingSettings schedulingSettings,
        TimeProvider timeProvider,
        RepositoryCleanupCandidateSource candidateSource,
        RepositoryCleanupCandidateProcessor candidateProcessor
    )
    {
        _settings = schedulingSettings.RepositoryCleanup;
        _timeProvider = timeProvider;
        _candidateSource = candidateSource;
        _candidateProcessor = candidateProcessor;
    }

    public async Task<RepositoryCleanupResult> DeleteInactiveRepositoriesAsync(
        CancellationToken cancellationToken = default
    )
    {
        DateTimeOffset cutoff = _timeProvider.GetUtcNow() - _settings.RetentionPeriod;
        int candidates = 0;
        int deleted = 0;
        int failed = 0;
        int skipped = 0;

        foreach (
            RepositoryCleanupCandidate candidate in _candidateSource
                .FindInactiveRepositories(cutoff, cancellationToken)
                .Take(_settings.MaxRepositoriesPerRun)
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            candidates++;

            RepositoryCleanupCandidateOutcome outcome = await _candidateProcessor.ProcessAsync(
                candidate,
                cutoff,
                cancellationToken
            );
            switch (outcome)
            {
                case RepositoryCleanupCandidateOutcome.Deleted:
                    deleted++;
                    break;
                case RepositoryCleanupCandidateOutcome.Failed:
                    failed++;
                    break;
                case RepositoryCleanupCandidateOutcome.Skipped:
                    skipped++;
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(outcome), outcome, null);
            }
        }

        return new RepositoryCleanupResult(candidates, deleted, failed, skipped);
    }
}
