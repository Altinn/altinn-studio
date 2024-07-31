namespace Altinn.App.Core.Features.ExternalApi;

/// <summary>
/// Interface of factory class for resolving <see cref="IExternalApiClient"/> implementations
/// </summary>
public interface IExternalApiFactory
{
    /// <summary>
    /// Finds the implementation of <see cref="IExternalApiClient"/> based on the external api id
    /// </summary>
    IExternalApiClient? GetExternalApiClient(string externalApiId);
}

/// <summary>
/// Factory class for resolving <see cref="IExternalApiClient"/> implementations
/// </summary>
internal sealed class ExternalApiFactory : IExternalApiFactory
{
    private IEnumerable<IExternalApiClient> _externalApiClients { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="ExternalApiFactory"/> class.
    /// </summary>
    /// <param name="externalApiClients"></param>
    public ExternalApiFactory(IEnumerable<IExternalApiClient> externalApiClients)
    {
        _externalApiClients = externalApiClients;
    }

    /// <inheritdoc/>
    /// <param name="externalApiId"></param>
    public IExternalApiClient? GetExternalApiClient(string externalApiId)
    {
        return _externalApiClients.FirstOrDefault(e => e.Id.Equals(externalApiId, StringComparison.OrdinalIgnoreCase));
    }
}
