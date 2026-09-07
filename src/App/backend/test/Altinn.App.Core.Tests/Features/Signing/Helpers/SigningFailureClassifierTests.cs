using System.Net;
using System.Net.Sockets;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.AccessManagement.Exceptions;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SigningFailureClassifierTests
{
    private static readonly CancellationToken NotCancelled = CancellationToken.None;

    private static CancellationToken Cancelled() => new(canceled: true);

    private static SigningFailureClassification ClassifyByKind(
        string kind,
        Exception exception,
        CancellationToken ct
    ) =>
        kind switch
        {
            "delegation" => SigningFailureClassifier.ClassifyDelegation(exception, ct),
            "notification" => SigningFailureClassifier.ClassifyNotification(exception, ct),
            _ => throw new ArgumentOutOfRangeException(nameof(kind)),
        };

    [Theory]
    [InlineData("delegation", HttpStatusCode.RequestTimeout)]
    [InlineData("delegation", HttpStatusCode.TooManyRequests)]
    [InlineData("delegation", HttpStatusCode.InternalServerError)]
    [InlineData("delegation", HttpStatusCode.BadGateway)]
    [InlineData("delegation", HttpStatusCode.ServiceUnavailable)]
    [InlineData("notification", HttpStatusCode.RequestTimeout)]
    [InlineData("notification", HttpStatusCode.TooManyRequests)]
    [InlineData("notification", HttpStatusCode.InternalServerError)]
    [InlineData("notification", HttpStatusCode.BadGateway)]
    [InlineData("notification", HttpStatusCode.ServiceUnavailable)]
    public void Classify_TransientStatus_IsTransient(string kind, HttpStatusCode status)
    {
        PlatformHttpException exception = new(status, "boom");

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.Equal(SigningFailureKind.Transient, classification.Kind);
        Assert.True(classification.IsTransient);
        Assert.Equal(status, classification.Status);
    }

    [Theory]
    [InlineData("delegation", HttpStatusCode.BadRequest)]
    [InlineData("delegation", HttpStatusCode.Forbidden)]
    [InlineData("delegation", HttpStatusCode.NotFound)]
    [InlineData("notification", HttpStatusCode.BadRequest)]
    [InlineData("notification", HttpStatusCode.Forbidden)]
    [InlineData("notification", HttpStatusCode.NotFound)]
    public void Classify_PermanentStatus_IsPermanentPerSignee(string kind, HttpStatusCode status)
    {
        PlatformHttpException exception = new(status, "boom");

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.Equal(SigningFailureKind.PermanentPerSignee, classification.Kind);
        Assert.False(classification.IsTransient);
        Assert.Equal(status, classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_HttpRequestException_WithStatus_UsesStatus(string kind)
    {
        HttpRequestException exception = new("boom", null, HttpStatusCode.ServiceUnavailable);

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.Equal(SigningFailureKind.Transient, classification.Kind);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_HttpRequestException_WithoutStatus_IsTransportFailure_Transient(string kind)
    {
        HttpRequestException exception = new("boom");

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.True(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_TimeoutException_IsTransient(string kind)
    {
        TimeoutException exception = new("timed out");

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.True(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_SocketException_IsTransient(string kind)
    {
        SocketException exception = new((int)SocketError.TimedOut);

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.True(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_OperationCanceledException_TokenNotCancelled_IsTransient(string kind)
    {
        OperationCanceledException exception = new();

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.True(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_OperationCanceledException_TokenCancelled_PropagatesCancellation(string kind)
    {
        OperationCanceledException exception = new();
        CancellationToken cancellationToken = Cancelled();

        OperationCanceledException result = Assert.Throws<OperationCanceledException>(() =>
            ClassifyByKind(kind, exception, cancellationToken)
        );

        Assert.Equal(cancellationToken, result.CancellationToken);
    }

    [Theory]
    [InlineData(HttpStatusCode.RequestTimeout, true)]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.Unauthorized, false)]
    [InlineData(HttpStatusCode.Forbidden, false)]
    [InlineData(HttpStatusCode.NotFound, false)]
    public void ClassifyNotification_AltinnTokenExchangeFailure_UsesDependencyStatus(
        HttpStatusCode status,
        bool transient
    )
    {
        CorrespondenceRequestException exception = TokenExchangeFailure(status);

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.Equal(transient, classification.IsTransient);
        Assert.Equal(status, classification.Status);
        Assert.Equal($"CorrespondenceRequestException ({(int)status} {status})", classification.Reason);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    [InlineData(HttpStatusCode.Unauthorized, false)]
    [InlineData(HttpStatusCode.Forbidden, false)]
    public async Task ClassifyNotification_MaskinportenTokenResponse_UsesDependencyStatus(
        HttpStatusCode status,
        bool transient
    )
    {
        using var response = new HttpResponseMessage(status) { Content = new StringContent("token request failed") };
        MaskinportenAuthenticationException cause = await Assert.ThrowsAsync<MaskinportenAuthenticationException>(() =>
            MaskinportenClient.ParseServerResponse(response)
        );
        var exception = new CorrespondenceRequestException("Failed to send correspondence", cause);

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.Equal(transient, classification.IsTransient);
        Assert.Equal(status, classification.Status);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest, HttpStatusCode.ServiceUnavailable, false)]
    [InlineData(HttpStatusCode.ServiceUnavailable, HttpStatusCode.BadRequest, true)]
    [InlineData(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable, false)]
    public void ClassifyNotification_OuterResponseStatus_TakesPrecedenceOverDependencyStatus(
        HttpStatusCode outerStatus,
        HttpStatusCode innerStatus,
        bool transient
    )
    {
        CorrespondenceRequestException exception = new(
            "response failed",
            null,
            outerStatus,
            null,
            TokenExchangeFailure(innerStatus)
        );

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.Equal(outerStatus, classification.Status);
        Assert.Equal(transient, classification.IsTransient);
    }

    [Fact]
    public void ClassifyNotification_ResponseStatus_TakesPrecedenceOverInnerTransportFailure()
    {
        CorrespondenceRequestException exception = new(
            "response failed",
            null,
            HttpStatusCode.BadRequest,
            null,
            new HttpRequestException("transport failure")
        );

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.False(classification.IsTransient);
        Assert.Equal(HttpStatusCode.BadRequest, classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_WrappedCancellation_PropagatesCallbackCancellation(string kind)
    {
        CancellationToken cancellationToken = Cancelled();
        var cause = new OperationCanceledException(cancellationToken);
        Exception exception =
            kind == "delegation"
                ? new AccessManagementRequestException("request cancelled", cause)
                : new CorrespondenceRequestException("request cancelled", cause);

        OperationCanceledException result = Assert.Throws<OperationCanceledException>(() =>
            ClassifyByKind(kind, exception, cancellationToken)
        );

        Assert.Equal(cancellationToken, result.CancellationToken);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_WrappedDependencyCancellation_WithoutCallbackCancellation_IsTransient(string kind)
    {
        var cause = new OperationCanceledException();
        Exception exception =
            kind == "delegation"
                ? new AccessManagementRequestException("request timed out", cause)
                : new CorrespondenceRequestException("request timed out", cause);

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.True(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    [Theory]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    public void ClassifyNotification_CallbackCancellation_TakesPrecedenceOverResponseStatus(HttpStatusCode status)
    {
        var exception = TokenExchangeFailure(status);
        CancellationToken cancellationToken = Cancelled();

        Assert.Throws<OperationCanceledException>(() =>
            SigningFailureClassifier.ClassifyNotification(exception, cancellationToken)
        );
    }

    [Fact]
    public void ClassifyNotification_ConfigurationError_AfterCallbackCancellation_PropagatesCancellation()
    {
        CancellationToken cancellationToken = Cancelled();

        Assert.Throws<OperationCanceledException>(() =>
            SigningFailureClassifier.ClassifyNotification(
                new ConfigurationException("missing resource"),
                cancellationToken
            )
        );
    }

    [Fact]
    public void ClassifyNotification_UnknownFailureWithoutStatus_RemainsPermanent()
    {
        var exception = new CorrespondenceRequestException("response was empty");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.False(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    private static CorrespondenceRequestException TokenExchangeFailure(HttpStatusCode status)
    {
        using var response = new HttpResponseMessage(status);
        HttpRequestException httpException = Assert.Throws<HttpRequestException>(() =>
            response.EnsureSuccessStatusCode()
        );
        // The same wrappers added by MaskinportenClient's Altinn exchange and CorrespondenceClient.Send.
        return new CorrespondenceRequestException(
            "Failed to send correspondence",
            new MaskinportenAuthenticationException("Authentication with Altinn failed", httpException)
        );
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_PlainException_IsPermanentPerSignee(string kind)
    {
        InvalidOperationException exception = new("boom");

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.False(classification.IsTransient);
        Assert.Equal(SigningFailureKind.PermanentPerSignee, classification.Kind);
        Assert.Null(classification.Status);
    }

    [Theory]
    [InlineData("delegation")]
    [InlineData("notification")]
    public void Classify_TransportCauseInInnerException_IsTransient(string kind)
    {
        TimeoutException inner = new("timed out");
        InvalidOperationException exception = new("wrapper", inner);

        SigningFailureClassification classification = ClassifyByKind(kind, exception, NotCancelled);

        Assert.True(classification.IsTransient);
        Assert.Null(classification.Status);
    }

    [Fact]
    public void ClassifyDelegation_AccessManagementRequestException_ReadsStatusFromException()
    {
        AccessManagementRequestException exception = new(
            "failed",
            problemDetails: null,
            statusCode: HttpStatusCode.BadRequest,
            responseBody: null
        );

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyDelegation(
            exception,
            NotCancelled
        );

        Assert.Equal(HttpStatusCode.BadRequest, classification.Status);
        Assert.Equal(SigningFailureKind.PermanentPerSignee, classification.Kind);
    }

    [Fact]
    public void ClassifyDelegation_NeverAppWide_EvenForConfigurationLikeExceptions()
    {
        // ClassifyDelegation never special-cases configuration exceptions the way ClassifyNotification does: the
        // app-wide cases for delegation are decided by the caller before delegation starts.
        ConfigurationException exception = new("no config");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyDelegation(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.PermanentPerSignee, classification.Kind);
    }

    [Fact]
    public void DelegationCode_WithStatus_ReturnsRejected()
    {
        SigningFailureClassification classification = new(
            SigningFailureKind.PermanentPerSignee,
            HttpStatusCode.BadRequest,
            "reason"
        );

        DelegationFailureCode code = SigningFailureClassifier.DelegationCode(classification);

        Assert.Equal(DelegationFailureCode.Rejected, code);
    }

    [Fact]
    public void DelegationCode_WithoutStatus_ReturnsUnknown()
    {
        SigningFailureClassification classification = new(SigningFailureKind.PermanentPerSignee, null, "reason");

        DelegationFailureCode code = SigningFailureClassifier.DelegationCode(classification);

        Assert.Equal(DelegationFailureCode.Unknown, code);
    }

    [Fact]
    public void ClassifyNotification_ConfigurationException_IsPermanentAppWide()
    {
        ConfigurationException exception = new("no correspondence resource");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.PermanentAppWide, classification.Kind);
        Assert.False(classification.IsTransient);
        Assert.Null(classification.Status);
        Assert.Equal("ConfigurationException: no correspondence resource", classification.Reason);
    }

    [Fact]
    public void ClassifyNotification_ApplicationConfigException_IsPermanentAppWide()
    {
        ApplicationConfigException exception = new("bad app config");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.PermanentAppWide, classification.Kind);
        Assert.Equal("ApplicationConfigException: bad app config", classification.Reason);
    }

    [Fact]
    public void ClassifyNotification_SigneeProviderNotFoundException_IsPermanentAppWide()
    {
        SigneeProviderNotFoundException exception = new("no provider registered");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.PermanentAppWide, classification.Kind);
        Assert.Equal("SigneeProviderNotFoundException: no provider registered", classification.Reason);
    }

    [Fact]
    public void NotificationCode_ConfigurationException_ReturnsConfiguration()
    {
        ConfigurationException exception = new("no correspondence resource");
        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        NotificationFailureCode code = SigningFailureClassifier.NotificationCode(exception, classification);

        Assert.Equal(NotificationFailureCode.Configuration, code);
    }

    [Fact]
    public void NotificationCode_ApplicationConfigException_ReturnsConfiguration()
    {
        ApplicationConfigException exception = new("bad app config");
        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        NotificationFailureCode code = SigningFailureClassifier.NotificationCode(exception, classification);

        Assert.Equal(NotificationFailureCode.Configuration, code);
    }

    [Fact]
    public void NotificationCode_SigneeProviderNotFoundException_ReturnsConfiguration()
    {
        SigneeProviderNotFoundException exception = new("no provider registered");
        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        NotificationFailureCode code = SigningFailureClassifier.NotificationCode(exception, classification);

        Assert.Equal(NotificationFailureCode.Configuration, code);
    }

    [Fact]
    public void NotificationCode_ExceptionWithStatus_ReturnsRejected()
    {
        CorrespondenceRequestException exception = new("boom", null, HttpStatusCode.BadRequest, null);
        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        NotificationFailureCode code = SigningFailureClassifier.NotificationCode(exception, classification);

        Assert.Equal(NotificationFailureCode.Rejected, code);
    }

    [Fact]
    public void NotificationCode_ExceptionWithoutStatus_ReturnsUnknown()
    {
        InvalidOperationException exception = new("boom");
        SigningFailureClassification classification = SigningFailureClassifier.ClassifyNotification(
            exception,
            NotCancelled
        );

        NotificationFailureCode code = SigningFailureClassifier.NotificationCode(exception, classification);

        Assert.Equal(NotificationFailureCode.Unknown, code);
    }

    [Theory]
    [InlineData(HttpStatusCode.Conflict, true)]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.OK, false)]
    public void IsAlreadySent_CorrespondenceRequestException_TrueOnlyFor409(HttpStatusCode status, bool expected)
    {
        CorrespondenceRequestException exception = new("boom", null, status, null);

        bool result = SigningFailureClassifier.IsAlreadySent(exception);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void IsAlreadySent_CorrespondenceRequestException_NoStatus_IsFalse()
    {
        CorrespondenceRequestException exception = new("boom");

        Assert.False(SigningFailureClassifier.IsAlreadySent(exception));
    }

    [Fact]
    public void IsAlreadySent_TokenExchangeConflict_DoesNotMeanCorrespondenceWasSent()
    {
        Assert.False(SigningFailureClassifier.IsAlreadySent(TokenExchangeFailure(HttpStatusCode.Conflict)));
    }

    [Fact]
    public void IsAlreadySent_OtherExceptionType_IsFalse()
    {
        AccessManagementRequestException exception = new(
            "boom",
            problemDetails: null,
            statusCode: HttpStatusCode.Conflict,
            responseBody: null
        );

        Assert.False(SigningFailureClassifier.IsAlreadySent(exception));
    }

    [Fact]
    public void ClassifyPartyLookup_TransientStatus_StaysTransient()
    {
        PlatformHttpException exception = new(HttpStatusCode.ServiceUnavailable, "boom");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyPartyLookup(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.Transient, classification.Kind);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, classification.Status);
    }

    [Fact]
    public void ClassifyPartyLookup_PermanentPerSigneeStatus_BecomesAppWide()
    {
        // ClassifyPartyLookup always upgrades a non-transient failure to app-wide: every signee needs the party.
        PlatformHttpException exception = new(HttpStatusCode.NotFound, "boom");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyPartyLookup(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.PermanentAppWide, classification.Kind);
        Assert.Equal(HttpStatusCode.NotFound, classification.Status);
    }

    [Fact]
    public void ClassifyPartyLookup_PlainException_BecomesAppWide()
    {
        InvalidOperationException exception = new("boom");

        SigningFailureClassification classification = SigningFailureClassifier.ClassifyPartyLookup(
            exception,
            NotCancelled
        );

        Assert.Equal(SigningFailureKind.PermanentAppWide, classification.Kind);
        Assert.Null(classification.Status);
    }

    [Fact]
    public void ShortReason_NoStatusNoTitle_IsJustTypeName()
    {
        InvalidOperationException exception = new("boom");

        string reason = SigningFailureClassifier.ShortReason(exception);

        Assert.Equal("InvalidOperationException", reason);
    }

    [Fact]
    public void ShortReason_WithStatus_IncludesStatusCode()
    {
        PlatformHttpException exception = new(HttpStatusCode.BadRequest, "boom");

        string reason = SigningFailureClassifier.ShortReason(exception);

        Assert.Equal("PlatformHttpException (400 BadRequest)", reason);
    }

    [Fact]
    public void ShortReason_CorrespondenceRequestException_WithProblemDetailsTitle_IncludesTitle()
    {
        CorrespondenceRequestException exception = new(
            "boom",
            new Microsoft.AspNetCore.Mvc.ProblemDetails { Title = "Resource not found" },
            HttpStatusCode.NotFound,
            null
        );

        string reason = SigningFailureClassifier.ShortReason(exception);

        Assert.Equal("CorrespondenceRequestException (404 NotFound): Resource not found", reason);
    }

    [Fact]
    public void ShortReason_AccessManagementRequestException_WithProblemDetailsTitle_IncludesTitle()
    {
        AccessManagementRequestException exception = new(
            "boom",
            new Microsoft.AspNetCore.Mvc.ProblemDetails { Title = "Delegation refused" },
            HttpStatusCode.Forbidden,
            null
        );

        string reason = SigningFailureClassifier.ShortReason(exception);

        Assert.Equal("AccessManagementRequestException (403 Forbidden): Delegation refused", reason);
    }

    [Fact]
    public void ShortReason_ConfigurationException_IncludesMessageWhenNoTitle()
    {
        ConfigurationException exception = new("no correspondence resource configured");

        string reason = SigningFailureClassifier.ShortReason(exception);

        Assert.Equal("ConfigurationException: no correspondence resource configured", reason);
    }
}
