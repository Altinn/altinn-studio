using System.Net.Http;

namespace Designer.Tests.Fixtures;

public class SharedDesignerHttpClientProvider
{
    public HttpClient SharedHttpClient { get; set; }
}
