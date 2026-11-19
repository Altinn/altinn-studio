using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.DelegatedSigning;

/// <summary>
/// Who the signees are, and which external call to break, and how, for the next signing transition. A signee is
/// numbered by the order the signee provider returns them, starting at 1.
/// </summary>
public sealed record SigningSetup
{
    /// <summary>When set, the only signee is this organization, instead of the persons in <see cref="SigningProbe.Signees"/>.</summary>
    public string? OrganizationSignee { get; init; }

    /// <summary>The signee whose first delegation Access Management refuses with 503.</summary>
    public int? FailDelegationToSignee { get; init; }

    /// <summary>
    /// The signee whose first call to action Localtest stores, but whose response the app never sees: it gets 503.
    /// </summary>
    public int? LoseNotificationResponseForSignee { get; init; }
}

public sealed record DelegationAttempt(string Recipient, bool Injected, bool Succeeded);

public sealed record RevocationAttempt(string Recipient, bool Succeeded);

/// <summary>One message sent through Correspondence: a call to action, which carries an idempotency key, or a receipt.</summary>
public sealed record CorrespondenceAttempt(
    string Recipient,
    Guid? IdempotentKey,
    int AttachmentCount,
    int StatusCode,
    bool ResponseLost
);

/// <summary>
/// Records every call signee initialization makes to the signee provider, Access Management and Correspondence,
/// and breaks the ones <see cref="SigningSetup"/> names. The calls themselves still reach Localtest.
/// </summary>
internal sealed class SigningProbe : IEndpointConfigurator
{
    public const string ProviderId = "integration-signees";
    public static readonly string[] Signees = ["01899699552", "17858296439"];

    private readonly object _gate = new();
    private SigningSetup _setup = new();
    private int _providerCalls;
    private readonly List<DelegationAttempt> _delegations = [];
    private readonly List<RevocationAttempt> _revocations = [];
    private readonly List<CorrespondenceAttempt> _correspondences = [];
    private readonly List<string> _delegationRecipients = [];
    private readonly List<string> _notificationRecipients = [];

    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/delegated-signing/reset",
            (SigningSetup setup) =>
            {
                lock (_gate)
                {
                    _setup = setup;
                    _providerCalls = 0;
                    _delegations.Clear();
                    _revocations.Clear();
                    _correspondences.Clear();
                    _delegationRecipients.Clear();
                    _notificationRecipients.Clear();
                }
                return Results.Ok();
            }
        );
        app.MapGet(
            "/test/delegated-signing/state",
            () =>
            {
                lock (_gate)
                {
                    return Results.Ok(
                        new SigningProbeState(
                            _providerCalls,
                            [.. _delegations],
                            [.. _revocations],
                            [.. _correspondences]
                        )
                    );
                }
            }
        );
    }

    public string? OrganizationSignee
    {
        get
        {
            lock (_gate)
                return _setup.OrganizationSignee;
        }
    }

    public void RecordProviderCall()
    {
        lock (_gate)
            _providerCalls++;
    }

    /// <summary>Whether to refuse this delegation, consuming the fault so the retry goes through.</summary>
    public bool TakeDelegationFault(string recipient)
    {
        lock (_gate)
        {
            if (!_delegationRecipients.Contains(recipient))
                _delegationRecipients.Add(recipient);
            if (_setup.FailDelegationToSignee != _delegationRecipients.IndexOf(recipient) + 1)
                return false;
            _setup = _setup with { FailDelegationToSignee = null };
            return true;
        }
    }

    /// <summary>Whether to hide this call to action's response, consuming the fault so the retry sees the truth.</summary>
    public bool TakeNotificationFault(string recipient)
    {
        lock (_gate)
        {
            if (!_notificationRecipients.Contains(recipient))
                _notificationRecipients.Add(recipient);
            if (_setup.LoseNotificationResponseForSignee != _notificationRecipients.IndexOf(recipient) + 1)
                return false;
            _setup = _setup with { LoseNotificationResponseForSignee = null };
            return true;
        }
    }

    public void Record(DelegationAttempt attempt)
    {
        lock (_gate)
            _delegations.Add(attempt);
    }

    public void Record(RevocationAttempt attempt)
    {
        lock (_gate)
            _revocations.Add(attempt);
    }

    public void Record(CorrespondenceAttempt attempt)
    {
        lock (_gate)
            _correspondences.Add(attempt);
    }
}

public sealed record SigningProbeState(
    int ProviderCalls,
    DelegationAttempt[] Delegations,
    RevocationAttempt[] Revocations,
    CorrespondenceAttempt[] Correspondences
);

internal sealed class IntegrationSigneeProvider(SigningProbe probe) : ISigneeProvider
{
    public string Id { get; init; } = SigningProbe.ProviderId;

    public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters)
    {
        probe.RecordProviderCall();
        if (probe.OrganizationSignee is { } organizationNumber)
        {
            return Task.FromResult(
                new SigneeProviderResult
                {
                    Signees =
                    [
                        new ProvidedOrganization
                        {
                            OrganizationNumber = organizationNumber,
                            Name = "Integration organization signee",
                        },
                    ],
                }
            );
        }

        return Task.FromResult(
            new SigneeProviderResult
            {
                Signees =
                [
                    .. SigningProbe.Signees.Select(
                        (ssn, index) =>
                            (ProvidedSignee)
                                new ProvidedPerson
                                {
                                    SocialSecurityNumber = ssn,
                                    FullName = $"Integration signee {index + 1}",
                                }
                    ),
                ],
            }
        );
    }
}

internal sealed class ProbingAccessManagementClient(IAccessManagementClient inner, SigningProbe probe)
    : IAccessManagementClient
{
    public async Task<DelegationResponse> DelegateRights(
        DelegationRequest delegation,
        CancellationToken cancellationToken = default
    )
    {
        string recipient = delegation.To!.Value;
        if (probe.TakeDelegationFault(recipient))
        {
            probe.Record(new DelegationAttempt(recipient, Injected: true, Succeeded: false));
            throw new HttpRequestException("Injected delegation failure", null, HttpStatusCode.ServiceUnavailable);
        }

        try
        {
            DelegationResponse response = await inner.DelegateRights(delegation, cancellationToken);
            probe.Record(new DelegationAttempt(recipient, Injected: false, Succeeded: true));
            return response;
        }
        catch
        {
            probe.Record(new DelegationAttempt(recipient, Injected: false, Succeeded: false));
            throw;
        }
    }

    public async Task<DelegationResponse> RevokeRights(
        DelegationRequest delegation,
        CancellationToken cancellationToken = default
    )
    {
        string recipient = delegation.To!.Value;
        try
        {
            DelegationResponse response = await inner.RevokeRights(delegation, cancellationToken);
            probe.Record(new RevocationAttempt(recipient, Succeeded: true));
            return response;
        }
        catch
        {
            probe.Record(new RevocationAttempt(recipient, Succeeded: false));
            throw;
        }
    }
}

internal sealed class SigningHttpFilter(SigningProbe probe) : IHttpMessageHandlerBuilderFilter
{
    public Action<HttpMessageHandlerBuilder> Configure(Action<HttpMessageHandlerBuilder> next) =>
        builder =>
        {
            next(builder);
            builder.AdditionalHandlers.Insert(0, new SigningHttpHandler(probe));
        };
}

/// <summary>
/// Answers the Altinn CDN's organization list, so the service owner resolves without the internet, and watches
/// the messages on their way to Localtest's Correspondence emulation.
/// </summary>
internal sealed class SigningHttpHandler(SigningProbe probe) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        if (request.RequestUri?.AbsoluteUri == "https://altinncdn.no/orgs/altinn-orgs.json")
        {
            return Json(
                HttpStatusCode.OK,
                new
                {
                    orgs = new
                    {
                        ttd = new
                        {
                            name = new
                            {
                                nb = "Testdepartementet",
                                nn = "Testdepartementet",
                                en = "Test Ministry",
                            },
                            orgnr = "991825827",
                            environments = new[] { "tt02" },
                        },
                    },
                }
            );
        }

        if (
            request.Method != HttpMethod.Post
            || request.RequestUri?.AbsolutePath.TrimEnd('/').EndsWith("/correspondence/api/v1/correspondence") != true
        )
        {
            return await base.SendAsync(request, cancellationToken);
        }

        using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
        string recipient = body.RootElement.GetProperty("recipients").EnumerateArray().Single().GetString()!;
        Guid? idempotentKey =
            body.RootElement.TryGetProperty("idempotentKey", out JsonElement key)
            && key.ValueKind == JsonValueKind.String
                ? key.GetGuid()
                : null;
        int attachmentCount =
            body.RootElement.TryGetProperty("existingAttachments", out JsonElement attachments)
            && attachments.ValueKind == JsonValueKind.Array
                ? attachments.GetArrayLength()
                : 0;

        HttpResponseMessage response = await base.SendAsync(request, cancellationToken);
        bool loseResponse = response.IsSuccessStatusCode && probe.TakeNotificationFault(recipient);
        probe.Record(
            new CorrespondenceAttempt(recipient, idempotentKey, attachmentCount, (int)response.StatusCode, loseResponse)
        );
        if (!loseResponse)
        {
            return response;
        }

        response.Dispose();
        return Json(HttpStatusCode.ServiceUnavailable, new { title = "Injected lost response", status = 503 });
    }

    private static HttpResponseMessage Json(HttpStatusCode status, object body) =>
        new(status) { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<SigningProbe>();
        services.AddSingleton<IEndpointConfigurator>(sp => sp.GetRequiredService<SigningProbe>());
        services.AddTransient<ISigneeProvider, IntegrationSigneeProvider>();
        services.AddSingleton<IHttpMessageHandlerBuilderFilter, SigningHttpFilter>();

        // Keep the real client, so every call still reaches Localtest, and only watch and break it.
        ServiceDescriptor accessManagement = services.Last(x => x.ServiceType == typeof(IAccessManagementClient));
        services.Remove(accessManagement);
        services.Add(
            new ServiceDescriptor(
                typeof(IAccessManagementClient),
                sp => new ProbingAccessManagementClient(
                    (IAccessManagementClient)(
                        accessManagement.ImplementationInstance
                        ?? accessManagement.ImplementationFactory?.Invoke(sp)
                        ?? ActivatorUtilities.CreateInstance(sp, accessManagement.ImplementationType!)
                    ),
                    sp.GetRequiredService<SigningProbe>()
                ),
                accessManagement.Lifetime
            )
        );
    }
}
