#nullable enable

using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features.AccessManagement;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Http;
using TestApp.Shared;

namespace TestApp.DelegatedSigning;

internal static class DelegatedSigningServices
{
    public static void Register(IServiceCollection services)
    {
        services.AddSingleton<DelegatedSigningState>();
        services.AddSingleton<IEndpointConfigurator>(sp => sp.GetRequiredService<DelegatedSigningState>());
        services.AddScoped<ISigneeProvider, IntegrationSigneeProvider>();
        services.AddSingleton<IHttpMessageHandlerBuilderFilter, SigningTransportFilter>();
        services.Configure<MvcOptions>(options => options.Filters.Add<SigningCallbackFilter>());

        // Keep the actual clients and commands. Only inject dependency failures and shorten the engine's backoff.
        var accessManagement = services.Last(x => x.ServiceType == typeof(IAccessManagementClient));
        services.Remove(accessManagement);
        services.Add(
            new ServiceDescriptor(
                typeof(IAccessManagementClient),
                sp => new RecordingAccessManagementClient(
                    CreateOriginal<IAccessManagementClient>(accessManagement, sp),
                    sp.GetRequiredService<DelegatedSigningState>()
                ),
                accessManagement.Lifetime
            )
        );

        foreach (
            var descriptor in services
                .Where(x =>
                    x.ServiceType == typeof(IWorkflowEngineCommand)
                    && x.ImplementationType?.Namespace == "Altinn.App.Core.Internal.Process.ProcessTasks.Signing"
                )
                .ToArray()
        )
        {
            services.Remove(descriptor);
            services.Add(
                new ServiceDescriptor(
                    typeof(IWorkflowEngineCommand),
                    sp => new FastRetryTaskCommand(CreateOriginal<IWorkflowEngineCommand>(descriptor, sp)),
                    descriptor.Lifetime
                )
            );
        }
    }

    private static T CreateOriginal<T>(ServiceDescriptor descriptor, IServiceProvider services)
        where T : class =>
        (T)(
            descriptor.ImplementationInstance
            ?? descriptor.ImplementationFactory?.Invoke(services)
            ?? ActivatorUtilities.CreateInstance(services, descriptor.ImplementationType!)
        );
}

internal sealed class IntegrationSigneeProvider(DelegatedSigningState state) : ISigneeProvider
{
    // A test can simulate correcting a deployed provider/config mismatch before resuming the workflow.
    public string Id
    {
        get => state.ProviderId;
        init { }
    }

    public Task<SigneeProviderResult> GetSignees(GetSigneesParameters parameters) =>
        Task.FromResult(state.GetSignees());
}

internal sealed class FastRetryTaskCommand(IWorkflowEngineCommand inner) : IWorkflowEngineCommand
{
    public string GetKey() => inner.GetKey();

    public ProcessStepOptions DefaultStepOptions =>
        new()
        {
            MaxExecutionTime = TimeSpan.FromSeconds(30),
            RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 2),
        };

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context) => inner.Execute(context);
}

internal sealed class RecordingAccessManagementClient(IAccessManagementClient inner, DelegatedSigningState state)
    : IAccessManagementClient
{
    public async Task<DelegationResponse> DelegateRights(DelegationRequest delegation, CancellationToken ct = default)
    {
        string recipient = delegation.To!.Value;
        var (attempt, failure) = state.BeginDelegation(delegation.InstanceId, recipient);
        bool forwarded = false;
        int status = 200;
        try
        {
            if (failure is { AfterSuccess: false })
                throw Failure(failure.StatusCode);
            forwarded = true;
            var response = await inner.DelegateRights(delegation, ct);
            if (failure is { AfterSuccess: true })
                throw Failure(failure.StatusCode);
            return response;
        }
        catch (HttpRequestException exception)
        {
            status = (int?)exception.StatusCode ?? 500;
            throw;
        }
        catch
        {
            status = 500;
            throw;
        }
        finally
        {
            state.RecordDelegation(new(delegation.InstanceId, recipient, attempt, forwarded, status));
        }
    }

    public async Task<DelegationResponse> RevokeRights(DelegationRequest delegation, CancellationToken ct = default)
    {
        int status = 200;
        try
        {
            return await inner.RevokeRights(delegation, ct);
        }
        catch (HttpRequestException exception)
        {
            status = (int?)exception.StatusCode ?? 500;
            throw;
        }
        catch
        {
            status = 500;
            throw;
        }
        finally
        {
            state.RecordRevocation(new(delegation.InstanceId, delegation.To!.Value, status));
        }
    }

    private static HttpRequestException Failure(int status) =>
        new("Injected delegation failure", null, (HttpStatusCode)status);
}

internal sealed class SigningTransportFilter(DelegatedSigningState state) : IHttpMessageHandlerBuilderFilter
{
    public Action<HttpMessageHandlerBuilder> Configure(Action<HttpMessageHandlerBuilder> next) =>
        builder =>
        {
            next(builder);
            builder.AdditionalHandlers.Insert(0, new SigningTransportHandler(state));
        };
}

internal sealed class SigningTransportHandler(DelegatedSigningState state) : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        if (request.RequestUri?.AbsoluteUri == "https://altinncdn.no/orgs/altinn-orgs.json")
        {
            return JsonResponse(
                200,
                new
                {
                    orgs = new
                    {
                        ttd = new
                        {
                            name = new
                            {
                                nb = "Test",
                                nn = "Test",
                                en = "Test",
                            },
                            orgnr = "991825827",
                            environments = new[] { "tt02" },
                        },
                    },
                }
            );
        }
        if (request.Method != HttpMethod.Post || !IsCorrespondenceInitialization(request.RequestUri))
            return await base.SendAsync(request, cancellationToken);

        // Parse the actual CorrespondenceClient wire payload, including the idempotentKey contract, then let
        // localtest's Correspondence emulation store it. This wrapper only injects failures and records attempts,
        // the same shape as the Access Management wrapper.
        using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
        var root = body.RootElement;
        Guid key = root.GetProperty("idempotentKey").GetGuid();
        if (key == Guid.Empty)
            throw new InvalidOperationException("Signing correspondence must carry a nonempty idempotency key");
        string recipient = root.GetProperty("recipients").EnumerateArray().Single().GetString()!;
        string instanceId = root.GetProperty("correspondence").GetProperty("sendersReference").GetString()!;

        var (attempt, alreadyAccepted, failure) = state.PlanNotification(instanceId, recipient, key);
        if (failure is { AfterSuccess: false })
        {
            // Refused before anything reaches localtest, so a retry is the first delivery.
            state.RecordNotification(new(instanceId, recipient, key, attempt, false, false, failure.StatusCode));
            return InjectedFailure(failure.StatusCode);
        }

        HttpResponseMessage response = await base.SendAsync(request, cancellationToken);
        int status = (int)response.StatusCode;
        bool duplicate = status == 409;
        bool accepted = status == 200;
        if (alreadyAccepted && !duplicate)
            throw new InvalidOperationException(
                $"localtest accepted idempotency key {key} twice; the Correspondence emulation must answer 409"
            );

        if (failure is { AfterSuccess: true } && accepted)
        {
            // Localtest stored the message, but the app loses the response. Its retry must get 409, not a copy.
            response.Dispose();
            state.RecordNotification(new(instanceId, recipient, key, attempt, true, false, failure.StatusCode));
            return InjectedFailure(failure.StatusCode);
        }

        state.RecordNotification(new(instanceId, recipient, key, attempt, accepted, duplicate, status));
        return response;
    }

    private static bool IsCorrespondenceInitialization(Uri? uri) =>
        uri is not null
        && uri.AbsolutePath.TrimEnd('/').EndsWith("/correspondence/api/v1/correspondence", StringComparison.Ordinal);

    private static HttpResponseMessage InjectedFailure(int status) =>
        JsonResponse(
            status,
            new
            {
                title = "Injected correspondence failure",
                status,
                detail = "Controlled by the delegated-signing integration fixture",
            }
        );

    private static HttpResponseMessage JsonResponse(int status, object body) =>
        new((HttpStatusCode)status)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
}

internal sealed class SigningCallbackFilter(DelegatedSigningState state) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var executed = await next();
        var payload = context.ActionArguments.Values.OfType<AppCallbackPayload>().SingleOrDefault();
        if (payload is null)
            return;
        string commandKey = payload.CommandKey;
        int status = executed.Exception is not null
            ? 500
            : executed.Result switch
            {
                ObjectResult result => result.StatusCode ?? 200,
                StatusCodeResult result => result.StatusCode,
                _ => context.HttpContext.Response.StatusCode,
            };
        bool deferred = executed.Result is ObjectResult { Value: AppCallbackResponse { Defer: not null } };
        string? publishedState = (executed.Result as ObjectResult)?.Value is AppCallbackResponse response
            ? response.State
            : null;
        int outgoingStatus = state.RecordCallback(payload, commandKey, status, deferred, publishedState);
        if (outgoingStatus != status)
            executed.Result = new StatusCodeResult(outgoingStatus);
    }
}
