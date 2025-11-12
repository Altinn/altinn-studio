using System.Collections;
using System.Linq.Expressions;
using System.Net;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Send.Client.Models;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;

namespace Altinn.App.Clients.Fiks.Tests;

internal static class TestHelpers
{
    public const string DummyToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    public static HttpClient GetHttpClientWithMockedHandler(
        HttpStatusCode statusCode,
        Func<HttpRequestMessage, string?>? authFactory = null,
        Func<HttpRequestMessage, string?>? contentFactory = null,
        Action<HttpRequestMessage>? requestCallback = null
    )
    {
        var mockHttpMessageHandler = new Mock<HttpMessageHandler>();
        mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                (HttpRequestMessage request, CancellationToken _) =>
                {
                    requestCallback?.Invoke(request);

                    return IsTokenRequest(request)
                        ? ResponseMessageFactory(HttpStatusCode.OK, authFactory?.Invoke(request) ?? DummyToken)
                        : ResponseMessageFactory(statusCode, contentFactory?.Invoke(request));
                }
            );

        return new HttpClient(mockHttpMessageHandler.Object);
    }

    private static HttpResponseMessage ResponseMessageFactory(HttpStatusCode statusCode, string? content) =>
        new(statusCode) { Content = content is not null ? new StringContent(content) : null };

    public static Func<HttpClient> GetHttpClientWithMockedHandlerFactory(
        HttpStatusCode statusCode,
        Func<HttpRequestMessage, string?>? authFactory = null,
        Func<HttpRequestMessage, string?>? contentFactory = null,
        Action<HttpRequestMessage>? requestCallback = null
    )
    {
        return () => GetHttpClientWithMockedHandler(statusCode, authFactory, contentFactory, requestCallback);
    }

    public static bool IsTokenRequest(HttpRequestMessage request)
    {
        string[] authEndpoints = ["/Home/GetTestOrgToken", "/token", "/exchange/maskinporten"];
        string requestPath = request.RequestUri!.AbsolutePath;

        return authEndpoints.Any(x => requestPath.Contains(x, StringComparison.OrdinalIgnoreCase));
    }

    public static MaskinportenSettings DefaultMaskinportenSettings =>
        new()
        {
            Authority = "test-authority",
            ClientId = "test-client-id",
            JwkBase64 = "test-jwk-base64",
        };

    public static FiksIOSettings DefaultFiksIOSettings =>
        new()
        {
            AccountId = Guid.Parse("58f559e2-783e-4b99-9527-8d3342ac4244"),
            IntegrationId = Guid.Parse("930d98f0-57de-4606-a9e8-4a4427249967"),
            IntegrationPassword = "test-integration-password",
            AccountPrivateKeyBase64 =
                "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2Z0lCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktnd2dnU2tBZ0VBQW9JQkFRQ1hnbXd1cHdqL3hoNG4KcDlPQmdUL3dxWEZaQmVEYXpsbFRFT29QQzVMZ1htVU0xa1loRldSVHQrc29iRXZnYU1YcHZmazhTYi9GQ3ZTSgoxT01aV1lnSHo1bFFXY2xFT0RFdjdCUVJoa2JBK3BOQUtZWWdUeFhsbjZzUHl3VHViaVdmOTlQTWNUVWNhangyCmlhTkIrZkRvQnUzaFRTZ1ZrODVseVBiVCs3Y0FCVkVlUVc4eWNHaCtYZ1VsY2R3a3N5WWI1bFN1SkRDUjkrYjAKajI3NFphQjlIUytWbVU1Mi9QWC9wYU5zQkswWlJTQTRSbEd0RFZ5SjJHUG9FQkhEVTM3L09lZGRYQVJVakZmawpjNis3K2JyYmtySDdtcVBtK3lwbm1samk4VDBLOEtuWUlPTDlQbkkzNGZPLy9DZjE1eDJ3Qmovd0p1NmVqMHkvClhlQmgxUDl4QWdNQkFBRUNnZ0VBWmRMc2Urb2NuVEY4SUxDazhCdDZhbmFtUytzc2RFRk1QUXhZRWFaNG5yd3gKODQrcWNCK2RYcnB6bTZZMDFHdjEzeUtpOTRhbEVIdE5YN2lvcStmRkNXTFhLZTQ5MnRCZEZsVDJJOVQzaGtpaApYL1RJUkx5Qi9lSHlLRm9NUldYWGVZd29WdlVhZWE5WVZWNHBUM1Q0R0NoWUJSeEN2VVdwNkRSSTFxME1EMEY2CnU5UWo4dENJYzkySVJFQVMzM0pPZXJxcVcxdmtSZ1hHbkErKzQ3OEtrNUhiWk9HUU5jcmZteFdDTkFmcjNPTkwKNUpadnNIZEh4OGZUNEhsSjV6WmFJV2NaMEFTWVVFMzZQbmRHcFprUWMrWmdZTGVDWS9qeWdtNjBFNlJaM1duYQo1RnM3ODYvQy8zVnc4ZTFOaWFRdkFybWRwRFloZVlYN2NhV1hFRVMzWlFLQmdRREpQN0RUc1p2TDJRL25YSnorCkxxSmU0emtxOXhEQ2F4alE5YmQ2OUlpNlFScFNsTWhnZCtPczVjWE04V0JqUnRQMnhGV0t0c2wvUUhHNFRZczAKalFZTkpxV2dhRHZ6bzNPN0hMREZxcEptQUU4YUVleCtpcEZ6YVhUaWVFNWsxMFBiT2FnZWpzN2dITzh1M3cwNgpJalZZSVVLeUtWOVRiTDdSbjFwRVRqd0pHd0tCZ1FEQXVvMlFLSFBnbFNpcFdXVzJqUnRydkkraFpvMDlUbWxyClYrUUsvTzNsOVN0TEhoZTE2QVNVZmVuM2hMeWtheUpvU2llSjJra0FRTGJMUkZRUDk2eVd5N3VaL1k1ekJKck0KSzdTaURKMjBaSGY5TnJqYzh3ZUFyTmx1QXBKQ1lCZ0JtTkRTSjVBazh6NEwrOEZldCtWbllleTFTSVFYMVk5VQo3MXdTMkRvT1l3S0JnUURGNGh1RVBKcmQyVVNiRVdUSlJwK2Z2N3VCdE1oRTh6dkdsQ1hpLzduRnNxZ29WV1dsCi9aemdjRnFMaHpob3hjYzhXSmRvT3cxc1U3aStLWGxjcGVJeVlqTHZ4QzVYQmZ5UkdzZnl4U01JcXZzY3ZrMFYKckRrVEM3bkR5ZG9EcSt0c0Q0aHc2Nmtka3pYWWw3aVExZnd2K1J4MHhOdVgwMURhRzkrTlZJUVJ5d0tCZ0NnSgpHTXN2ZkJMVktXTTBqT3FGR1lNaDRueFd2MVJTNjVjKzVNSmJsRmZHdkQyWWZMaHZBRFNRaTMrOWRTcDZqdVUzCk1rdHlxdU9BamZoZnMwNjExb1prd0EzWEhEWk1hSk90S0pMWktCR0hKVjNXZGtSL3Y3azlMdFdwZHhTT3ZhM24KUHNuSktpcGkxU3JNRzNrL25rb0JqNWlBL2QrdG4xNjNjbHIveTkrZEFvR0JBS2tCTmtPVzlkN05mOWJOdnNEbAo1TXNVSUpPenNmUDdBSTVvRXFnQ1hVQnhrNEZ0cjVnN25oM1E0NExBSHZXSzFXWkRxcW90VFVadW8yTWlLeDArCk1IbFoxekxTMTB0ck05TnpvSHYyVytUZ0t0YXVxTHl0eUVUWDJadEJlV09CNXhQb0FjS2FuQnlTWCtUbjZ3YkkKV09mSnl6R2M4Vm5rSXMrMzZ5eGZPN3FxCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=",
        };

    public static FiksArkivSettings DefaultFiksArkivSettings =>
        new()
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "fiks-receipt" },
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "fiks-receipt" },
            },
            Recipient = new FiksArkivRecipientSettings
            {
                FiksAccount = new FiksArkivBindableValue<Guid?>
                {
                    DataModelBinding = new FiksArkivDataModelBinding { DataType = "model", Field = "recipient" },
                },
                Identifier = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                OrganizationNumber = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                Name = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
            },
            Documents = new FiksArkivDocumentSettings
            {
                PrimaryDocument = new FiksArkivDataTypeSettings
                {
                    DataType = "ref-data-as-pdf",
                    Filename = "formdata.pdf",
                },
                Attachments =
                [
                    new FiksArkivDataTypeSettings { DataType = "model", Filename = "formdata.xml" },
                    new FiksArkivDataTypeSettings { DataType = "uploaded_attachment" },
                ],
            },
            SuccessHandling = new FiksArkivSuccessHandlingSettings
            {
                MoveToNextTask = true,
                MarkInstanceComplete = true,
                Action = "fiks-arkiv-success",
            },
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = true, Action = "fiks-arkiv-error" },
        };

    public static MaskinportenSettings RandomMaskinportenSettings =>
        new()
        {
            Authority = Guid.NewGuid().ToString(),
            ClientId = Guid.NewGuid().ToString(),
            JwkBase64 = Guid.NewGuid().ToString(),
        };

    public static FiksIOSettings RandomFiksIOSettings =>
        new()
        {
            AccountId = Guid.NewGuid(),
            IntegrationId = Guid.NewGuid(),
            IntegrationPassword = Guid.NewGuid().ToString(),
            AccountPrivateKeyBase64 = Guid.NewGuid().ToString(),
            AmqpHost = Guid.NewGuid().ToString(),
            ApiHost = Guid.NewGuid().ToString(),
        };

    public static FiksArkivSettings RandomFiksArkivSettings =>
        new()
        {
            Metadata = new FiksArkivMetadataSettings
            {
                CaseFileId = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                CaseFileTitle = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                JournalEntryTitle = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                RuleId = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                SystemId = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
            },
            Recipient = new FiksArkivRecipientSettings
            {
                FiksAccount = new FiksArkivBindableValue<Guid?>
                {
                    DataModelBinding = new FiksArkivDataModelBinding
                    {
                        DataType = Guid.NewGuid().ToString(),
                        Field = Guid.NewGuid().ToString(),
                    },
                },
                Identifier = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                OrganizationNumber = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
                Name = new FiksArkivBindableValue<string> { Value = Guid.NewGuid().ToString() },
            },
            Receipt = new FiksArkivReceiptSettings
            {
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = Guid.NewGuid().ToString() },
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = Guid.NewGuid().ToString() },
            },

            Documents = new FiksArkivDocumentSettings
            {
                PrimaryDocument = new FiksArkivDataTypeSettings
                {
                    DataType = Guid.NewGuid().ToString(),
                    Filename = Guid.NewGuid().ToString(),
                },
                Attachments =
                [
                    new FiksArkivDataTypeSettings
                    {
                        DataType = Guid.NewGuid().ToString(),
                        Filename = Guid.NewGuid().ToString(),
                    },
                ],
            },
            ErrorHandling = new FiksArkivErrorHandlingSettings { Action = Guid.NewGuid().ToString() },
            SuccessHandling = new FiksArkivSuccessHandlingSettings { Action = Guid.NewGuid().ToString() },
        };

    public static FiksIOMessageResponse GetFiksIOMessageResponse(
        string messageType = FiksArkivMeldingtype.ArkivmeldingOpprettMottatt,
        Guid? inReplyToMessage = null,
        string? correlationId = null
    )
    {
        return new FiksIOMessageResponse(
            SendtMelding.FromSentMessageApiModel(
                new SendtMeldingApiModel
                {
                    MeldingId = Guid.NewGuid(),
                    MeldingType = messageType,
                    AvsenderKontoId = Guid.NewGuid(),
                    MottakerKontoId = Guid.NewGuid(),
                    SvarPaMelding = inReplyToMessage,
                    Headere = new Dictionary<string, string>
                    {
                        [MeldingBase.HeaderKlientKorrelasjonsId] = correlationId ?? string.Empty,
                    },
                }
            )
        );
    }

    public static FiksIOMessageRequest GetFiksIOMessageRequest(
        string messageType = FiksArkivMeldingtype.ArkivmeldingOpprett,
        Guid? recipient = null,
        Guid? sendersReference = null,
        Guid? inReplyToMessage = null,
        string? correlationId = null,
        IEnumerable<FiksIOMessagePayload>? payload = null
    )
    {
        return new FiksIOMessageRequest(
            recipient ?? Guid.NewGuid(),
            messageType,
            sendersReference ?? Guid.NewGuid(),
            payload ?? [],
            inReplyToMessage,
            correlationId
        );
    }

    public class CustomFiksArkivPayloadGenerator : IFiksArkivPayloadGenerator
    {
        public Task<IEnumerable<FiksIOMessagePayload>> GeneratePayload(
            string taskId,
            Instance instance,
            FiksArkivRecipient recipient,
            string messageType,
            CancellationToken cancellationToken = default
        ) => throw new NotImplementedException();
    }

    public class CustomFiksArkivResponseHandler : IFiksArkivResponseHandler
    {
        public Task HandleSuccess(
            Instance instance,
            FiksIOReceivedMessage message,
            IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
            CancellationToken cancellationToken = default
        ) => throw new NotImplementedException();

        public Task HandleError(
            Instance instance,
            FiksIOReceivedMessage message,
            IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
            CancellationToken cancellationToken = default
        ) => throw new NotImplementedException();
    }

    public static FiksArkivBindableValue<T> BindableValueFactory<T>(string dataTypeId, string field) =>
        new()
        {
            DataModelBinding = new FiksArkivDataModelBinding { DataType = dataTypeId, Field = field },
        };

    public static FiksArkivBindableValue<T> BindableValueFactory<T>(T value) => new() { Value = value };

    public static Expression<Action<ILogger<T>>> MatchLogEntry<T>(
        LogLevel logLevel,
        string partialMessage,
        ILogger<T> _
    )
        where T : class
    {
        return x =>
            x.Log(
                logLevel,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>(
                    (v, _) => v.ToString()!.Contains(partialMessage, StringComparison.OrdinalIgnoreCase)
                ),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()
            );
    }

    public static string GeneratePemPrivateKey()
    {
        using var rsa = RSA.Create(2048);
        var privateKeyBytes = rsa.ExportPkcs8PrivateKey();
        var base64 = Convert.ToBase64String(privateKeyBytes);
        var sb = new StringBuilder();
        sb.AppendLine("-----BEGIN PRIVATE KEY-----");
        for (int i = 0; i < base64.Length; i += 64)
        {
            sb.AppendLine(base64.Substring(i, Math.Min(64, base64.Length - i)));
        }
        sb.AppendLine("-----END PRIVATE KEY-----");
        return sb.ToString();
    }
}

internal static class TestExtensions
{
    public static SettingsTask UseDefaultSettings(
        this SettingsTask settingsTask,
        object? testIterationId = null,
        [CallerMemberName] string callerName = ""
    )
    {
        var testId = testIterationId is null ? "" : $".{testIterationId}";
        return settingsTask.UseMethodName($"{callerName}{testId}").UseDirectory(".Verify");
    }
}
