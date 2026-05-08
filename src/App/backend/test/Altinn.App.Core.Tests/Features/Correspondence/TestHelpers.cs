using System.Net;
using System.Text.Json;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Correspondence.Models.Response;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Features.Correspondence;

public static class TestHelpers
{
    public static OrganisationNumber GetOrganisationNumber(int index) =>
        IdentificationNumberProvider.OrganisationNumbers.GetValidNumber(index);

    public static NationalIdentityNumber GetNationalIdentityNumber(int index) =>
        IdentificationNumberProvider.NationalIdentityNumbers.GetValidNumber(index);

    public static HttpResponseMessage ResponseMessageFactory<T>(
        T content,
        HttpStatusCode statusCode = HttpStatusCode.OK
    )
    {
        string test = content as string ?? JsonSerializer.Serialize(content);

        return new HttpResponseMessage(statusCode) { Content = new StringContent(test) };
    }

    public static Task<JwtToken> OrgTokenFactory(IEnumerable<string> scopes)
    {
        var formattedScopes = MaskinportenClient.GetFormattedScopes(scopes);
        string token;

        try
        {
            token = TestAuthentication.GetServiceOwnerToken(scope: formattedScopes);
        }
        catch (InvalidOperationException)
        {
            token = TestAuthentication.GetOrgToken(scope: formattedScopes);
        }

        return Task.FromResult(JwtToken.Parse(token));
    }

    public static SendCorrespondenceResponse DummySendCorrespondenceResponse =>
        new()
        {
            Correspondences = new List<CorrespondenceDetailsResponse>
            {
                new()
                {
                    CorrespondenceId = Guid.Empty,
                    Status = CorrespondenceStatus.Initialized,
                    Recipient = OrganisationOrPersonIdentifier.Create(GetOrganisationNumber(0)),
                },
            },
        };

    internal static Guid DummyAttachmentId { get; } = Guid.Parse("11111111-2222-3333-4444-555555555555");

    internal static AttachmentOverviewResponse DummyAttachmentOverviewResponse(
        CorrespondenceAttachmentStatusResponse status
    ) =>
        new()
        {
            AttachmentId = DummyAttachmentId,
            Status = status,
            StatusText = status.ToString(),
            StatusChanged = DateTimeOffset.MinValue,
            ResourceId = "test-resource-id",
            SendersReference = "attachment-ref",
        };

    public static GetCorrespondenceStatusResponse DummyGetCorrespondenceStatusResponse =>
        new()
        {
            CorrespondenceId = Guid.Empty,
            Created = DateTimeOffset.MinValue,
            StatusChanged = DateTimeOffset.MinValue,
            Recipient = GetOrganisationNumber(0),
            Sender = GetOrganisationNumber(1),
            Status = CorrespondenceStatus.Published,
            StatusHistory = [],
            ResourceId = string.Empty,
            SendersReference = string.Empty,
        };
}
