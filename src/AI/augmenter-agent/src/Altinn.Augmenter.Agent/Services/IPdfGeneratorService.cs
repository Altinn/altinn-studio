using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services;

public interface IPdfGeneratorService
{
    Task<byte[]> GeneratePdfAsync(JsonDocument data, CancellationToken cancellationToken = default);
}
