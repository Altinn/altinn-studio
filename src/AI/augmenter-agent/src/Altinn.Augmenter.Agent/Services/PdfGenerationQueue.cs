using System.Threading.Channels;
using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public sealed class PdfGenerationQueue : IPdfGenerationQueue
{
    private readonly Channel<PdfGenerationJob> _channel =
        Channel.CreateBounded<PdfGenerationJob>(100);

    public bool TryEnqueue(PdfGenerationJob job) =>
        _channel.Writer.TryWrite(job);

    internal ChannelReader<PdfGenerationJob> Reader => _channel.Reader;
}
