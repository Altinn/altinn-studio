using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public interface IPdfGenerationQueue
{
    ValueTask EnqueueAsync(PdfGenerationJob job, CancellationToken cancellationToken = default);
}
