using System.Net;
using System.Text.Json;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Signing.Helpers;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SigningFailuresTests
{
    private static readonly Dictionary<string, (Func<Exception> Create, bool Transient)> _failures = new()
    {
        ["bad request"] = (() => Correspondence(HttpStatusCode.BadRequest), false),
        ["not found"] = (() => new HttpRequestException("Not found", null, HttpStatusCode.NotFound), false),
        ["request timeout"] = (() => Correspondence(HttpStatusCode.RequestTimeout), true),
        ["too many requests"] = (() => Correspondence(HttpStatusCode.TooManyRequests), true),
        ["server error"] = (() => Correspondence(HttpStatusCode.ServiceUnavailable), true),
        ["connection failure"] = (() => new HttpRequestException("Connection refused"), true),
        ["wrapped connection failure"] = (
            () => new CorrespondenceRequestException("Failed", new HttpRequestException("Connection refused")),
            true
        ),
        ["timeout"] = (() => new TimeoutException(), true),
        ["HttpClient timeout"] = (() => new TaskCanceledException("Timed out", new TimeoutException()), true),
        ["cancellation"] = (() => new OperationCanceledException(), true),
        ["identifier that does not parse"] = (() => new FormatException("Not a national identity number"), false),
        ["response that does not deserialize"] = (
            () => new CorrespondenceRequestException("Failed", new JsonException("Unexpected token")),
            false
        ),
        ["bug in the app"] = (() => new InvalidOperationException("Sequence contains no elements"), false),
        ["configuration error behind a server error"] = (
            () =>
                new CorrespondenceRequestException(
                    "Failed",
                    null,
                    HttpStatusCode.ServiceUnavailable,
                    null,
                    new ConfigurationException("No resource configured")
                ),
            false
        ),
    };

    public static TheoryData<string> Failures => [.. _failures.Keys];

    [Theory]
    [MemberData(nameof(Failures))]
    public void IsTransient_IsTrueOnlyWithEvidenceThatARetryCanSucceed(string failure)
    {
        (Func<Exception> create, bool transient) = _failures[failure];

        Assert.Equal(transient, SigningFailures.IsTransient(create()));
    }

    private static CorrespondenceRequestException Correspondence(HttpStatusCode status) =>
        new("Failed", null, status, null);
}
