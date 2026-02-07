namespace Altinn.Augmenter.Agent.Services;

public interface IPdfGeneratorService
{
    Task<byte[]> GeneratePdfAsync(DateTime timestamp);
}
