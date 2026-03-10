using System.Net;
using System.Text.Json;
using Altinn.App.Core.Constants;
using Altinn.App.Tests.Common.Data;

namespace Altinn.App.Tests.Common.Mocks;

public class AltinnPartyClientInterceptor : HttpMessageHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var requestParts = request.RequestUri?.AbsolutePath.Split("/") ?? [];

        return requestParts switch
        {
            ["", "register", "api", "v1", "parties", var partyIdString]
                when int.TryParse(partyIdString, out var partyId) => GetPartyResponse(partyId),
            ["", "register", "api", "v1", "apps", "parties", "query"] => GetPartyQueryResponse(
                await request.Content!.ReadAsStringAsync(cancellationToken)
            ),
            ["", "parties", "lookup"] => GetPartyLookupResponse(
                await request.Content!.ReadAsStringAsync(cancellationToken)
            ),
            _ => throw new NotImplementedException(
                $"The {nameof(AltinnPartyClientInterceptor)} is not implemented for paths like {request.RequestUri}.)"
            ),
        };
    }

    /// <summary>
    /// Currently not required by any tests, but can be implemented if needed.
    /// The implementation should be similar to
    /// <see cref="AltinnPartyClientMock.LookupParty(Platform.Register.Models.PartyLookup)"/>
    /// </summary>
    private HttpResponseMessage GetPartyLookupResponse(string lookupContent)
    {
        throw new NotImplementedException();
    }

    private HttpResponseMessage GetPartyQueryResponse(string queryContent)
    {
        // This is a very simple implementation that only recognizes a single known URN. It can be extended to support more complex scenarios if needed.
        using var document = JsonDocument.Parse(queryContent);
        var knownUrn = AltinnUrns.SelfIdentifiedEmail + ":" + "post@altinn.no";
        var knownPartyId = 510004;
        if (document.RootElement.GetProperty("data").EnumerateArray().FirstOrDefault().GetString() == knownUrn)
        {
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent($$"""{"data": [{"partyId": {{knownPartyId}}}]}"""),
            };
        }
        throw new NotImplementedException("Unknown URN in party query: " + queryContent);
    }

    private HttpResponseMessage GetPartyResponse(int partyId)
    {
        var path = CommonTestData.GetAltinnProfilePath();

        var file = Path.Join(path, $"{partyId}.json");
        if (!File.Exists(file))
        {
            return new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent($"Could not find party with id {partyId} in {path}"),
            };
        }

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StreamContent(new FileStream(file, FileMode.Open)),
        };
    }
}
