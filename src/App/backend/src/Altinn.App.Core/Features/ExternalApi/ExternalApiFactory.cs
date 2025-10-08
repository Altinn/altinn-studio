namespace Altinn.App.Core.Features.ExternalApi;

internal interface IExternalApiFactory
{
    IExternalApiClient? GetExternalApiClient(string externalApiId);

    string[] GetAllExternalApiIds();
}

internal sealed class ExternalApiFactory : IExternalApiFactory
{
    private readonly AppImplementationFactory _appImplementationFactory;

    public ExternalApiFactory(AppImplementationFactory appImplementationFactory)
    {
        _appImplementationFactory = appImplementationFactory;
    }

    public IExternalApiClient? GetExternalApiClient(string externalApiId)
    {
        var externalApiClients = _appImplementationFactory.GetAll<IExternalApiClient>();
        return externalApiClients.FirstOrDefault(e => e.Id.Equals(externalApiId, StringComparison.OrdinalIgnoreCase));
    }

    public string[] GetAllExternalApiIds()
    {
        var externalApiClients = _appImplementationFactory.GetAll<IExternalApiClient>();
        return externalApiClients.Select(e => e.Id).ToArray();
    }
}
