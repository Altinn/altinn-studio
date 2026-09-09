using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using KS.Fiks.IO.Send.Client.Exceptions;

namespace Altinn.App.Clients.Fiks.Tests.FiksIO;

/// <summary>
/// The send-failure classification `FiksArkivServiceTask` branches its catch arms on: only failures that
/// provably fail identically on every retry may match a predicate at all, and the two predicates split them
/// by who remediates — case-level concludes the exchange, app-level fails the workflow for the operator.
/// </summary>
public class FiksIOSendFailureTest
{
    [Fact]
    public void FiksIORefusingTheIntegrationCredentials_IsCredentialsRefused()
    {
        Assert.True(FiksIOSendFailure.IsCredentialsRefused(new FiksIOSendUnauthorizedException("refused")));
        Assert.False(FiksIOSendFailure.IsRecipientNotFound(new FiksIOSendUnauthorizedException("refused")));
    }

    [Fact]
    public void AnUnexpectedResponseNamingNotFound_IsRecipientNotFound()
    {
        // The recipient account does not exist. Matched case-insensitively — the message wording is the
        // client library's, not ours.
        var pascal = new FiksIOSendUnexpectedResponseException("Send failed with status code NotFound");
        var upper = new FiksIOSendUnexpectedResponseException("send failed with STATUS CODE NOTFOUND");

        Assert.True(FiksIOSendFailure.IsRecipientNotFound(pascal));
        Assert.True(FiksIOSendFailure.IsRecipientNotFound(upper));
        Assert.False(FiksIOSendFailure.IsCredentialsRefused(pascal));
    }

    /// <summary>
    /// Load-bearing: <c>MaskinportenException</c> wraps transport failures and 5xx as well as refusals, and
    /// even a genuine refusal can heal (key rollover, clock skew) — not deterministic, so it must retry
    /// rather than conclude the exchange or fail the workflow over what may be a passing outage.
    /// </summary>
    [Fact]
    public void AMaskinportenFailure_MatchesNeitherPredicate()
    {
        var exception = new MaskinportenAuthenticationException("token request refused");

        Assert.False(FiksIOSendFailure.IsCredentialsRefused(exception));
        Assert.False(FiksIOSendFailure.IsRecipientNotFound(exception));
    }

    [Fact]
    public void EveryOtherFailure_MatchesNeitherPredicate()
    {
        Exception[] transientOrUnknown =
        [
            new FiksIOSendUnexpectedResponseException("Send failed with status code InternalServerError"),
            new TimeoutException("Fiks unavailable"),
            new HttpRequestException("connection reset"),
            new OperationCanceledException("attempt deadline"),
        ];

        Assert.All(
            transientOrUnknown,
            exception =>
            {
                Assert.False(FiksIOSendFailure.IsCredentialsRefused(exception));
                Assert.False(FiksIOSendFailure.IsRecipientNotFound(exception));
            }
        );
    }
}
