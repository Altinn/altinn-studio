using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public interface IPdfGenerationQueue
{
    bool TryEnqueue(PdfGenerationJob job);
}
