using System.Net.Http;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public static class RuntimeGatewayHttpClientExtensions
{
    internal static HttpClient GetRuntimeGatewayHttpClient(this IHttpClientFactory factory, AltinnEnvironment environment)
    {
        return environment == AltinnEnvironment.Prod
            ? factory.CreateClient("runtime-gateway-Prod")
            : factory.CreateClient("runtime-gateway-Test");
    }
}
