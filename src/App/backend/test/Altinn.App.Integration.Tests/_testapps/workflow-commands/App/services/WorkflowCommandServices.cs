#nullable enable
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Features.Payment.Processors;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using TestApp.Shared;
using WorkflowCommandCustomer;

namespace TestApp.WorkflowCommands;

internal static class WorkflowCommandServices
{
    public static void Register(IServiceCollection services)
    {
        CustomerRegistration.Register(services);
        services.AddSingleton<PaymentTestState>();
        services.AddSingleton<IEndpointConfigurator, CommandEndpoints>();
        services.AddScoped<IPaymentProcessor, ControlledPaymentProcessor>();
        services.AddScoped<IPdfService, ReceiptPdfService>();
        services.Configure<MvcOptions>(options => options.Filters.Add<PaymentCallbackFilter>());
        foreach (var descriptor in services.Where(x => x.ServiceType == typeof(IWorkflowEngineCommand)).ToArray())
        {
            services.Remove(descriptor);
            services.Add(
                new ServiceDescriptor(
                    typeof(IWorkflowEngineCommand),
                    sp =>
                    {
                        var inner = (IWorkflowEngineCommand)(
                            descriptor.ImplementationInstance
                            ?? descriptor.ImplementationFactory?.Invoke(sp)
                            ?? ActivatorUtilities.CreateInstance(sp, descriptor.ImplementationType!)
                        );
                        return new FastPaymentCommand(inner);
                    },
                    descriptor.Lifetime
                )
            );
        }
    }
}

internal sealed class FastPaymentCommand(IWorkflowEngineCommand inner) : IWorkflowEngineCommand
{
    public string GetKey() => inner.GetKey();

    public ProcessStepOptions? DefaultStepOptions =>
        GetKey() is "CleanupPayment" or "CompletePayment"
            ? new() { RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 2) }
            : inner.DefaultStepOptions;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context) => inner.Execute(context);
}

internal sealed class CommandEndpoints(CommandTestState commands, PaymentTestState payment) : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/commands/reset",
            (CommandControl control) =>
            {
                commands.Reset(control);
                return Results.Ok();
            }
        );
        app.MapPost(
            "/test/commands/allow",
            (bool? selectCommands) =>
            {
                commands.Allow(selectCommands ?? true);
                return Results.Ok();
            }
        );
        app.MapGet("/test/commands/state", () => Results.Json(commands.Snapshot()));
        app.MapPost(
            "/test/payment/reset",
            (PaymentControl control) =>
            {
                payment.Reset(control);
                return Results.Ok();
            }
        );
        app.MapPost(
            "/test/payment/allow",
            () =>
            {
                payment.Allow();
                return Results.Ok();
            }
        );
        app.MapGet("/test/payment/state", () => Results.Json(payment.Snapshot()));
    }
}

public sealed record PaymentControl(int TerminationFailures = 0, string? LoseCommandResponse = null);

public sealed record PaymentCallback(string Key, Guid WorkflowId, Guid StepId, int RetryCount, int StatusCode);

public sealed record PaymentSnapshot(
    int TerminationCalls,
    int AcceptedTerminations,
    int PdfCalls,
    int LostResponses,
    string? ReceiptIdBeforeResponseLoss,
    PaymentCallback[] Callbacks
);

internal sealed class PaymentTestState
{
    private readonly object _gate = new();
    private PaymentControl _control = new();
    private int _terminationCalls,
        _pdfCalls,
        _lostResponses;
    private readonly HashSet<string> _terminated = [];
    private readonly List<PaymentCallback> _callbacks = [];
    private string? _receiptId;

    public void Reset(PaymentControl control)
    {
        lock (_gate)
        {
            _control = control;
            _terminationCalls = _pdfCalls = _lostResponses = 0;
            _terminated.Clear();
            _callbacks.Clear();
            _receiptId = null;
        }
    }

    public void Allow()
    {
        lock (_gate)
            _control = _control with { TerminationFailures = 0 };
    }

    public bool Terminate(string paymentId)
    {
        lock (_gate)
        {
            _terminationCalls++;
            if (_control.TerminationFailures != 0)
            {
                if (_control.TerminationFailures > 0)
                    _control = _control with { TerminationFailures = _control.TerminationFailures - 1 };
                return false;
            }
            _terminated.Add(paymentId);
            return true;
        }
    }

    public void Pdf()
    {
        lock (_gate)
            _pdfCalls++;
    }

    public bool LoseResponse(string key)
    {
        lock (_gate)
        {
            if (_control.LoseCommandResponse != key || _lostResponses != 0)
                return false;
            _lostResponses++;
            return true;
        }
    }

    public void Receipt(string? id)
    {
        lock (_gate)
            _receiptId = id;
    }

    public void Callback(PaymentCallback callback)
    {
        lock (_gate)
            _callbacks.Add(callback);
    }

    public PaymentSnapshot Snapshot()
    {
        lock (_gate)
            return new(
                _terminationCalls,
                _terminated.Count,
                _pdfCalls,
                _lostResponses,
                _receiptId,
                _callbacks.ToArray()
            );
    }
}

internal sealed class ControlledPaymentProcessor(PaymentTestState state) : IPaymentProcessor
{
    public string PaymentProcessorId => "integration-payment";

    public Task<bool> TerminatePayment(Instance instance, PaymentInformation paymentInformation) =>
        Task.FromResult(state.Terminate(paymentInformation.PaymentDetails!.PaymentId));

    public Task<PaymentDetails> StartPayment(Instance instance, OrderDetails orderDetails, string? language) =>
        throw new InvalidOperationException("Payment lifecycle tests must not start a vendor payment.");

    public Task<(PaymentStatus status, PaymentDetails paymentDetails)> GetPaymentStatus(
        Instance instance,
        string paymentId,
        decimal expectedTotalIncVat,
        string? language
    ) => throw new InvalidOperationException("Payment lifecycle tests must not query a vendor payment.");
}

// PDF rendering has its own integration suite; this fixture controls only the payment receipt bytes.
internal sealed class ReceiptPdfService(PaymentTestState state) : IPdfService
{
    public Task GenerateAndStorePdf(
        IInstanceDataMutator data,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    ) => throw new InvalidOperationException("Unexpected default PDF generation.");

    public Task<Stream> GeneratePdf(Instance instance, string taskId, CancellationToken ct) =>
        GeneratePdf(instance, taskId, false, ct: ct);

    public Task<Stream> GeneratePdf(
        Instance instance,
        string taskId,
        bool isPreview,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        ct.ThrowIfCancellationRequested();
        state.Pdf();
        return Task.FromResult<Stream>(new MemoryStream("%PDF-1.7\n% Payment integration receipt\n%%EOF"u8.ToArray()));
    }
}

internal sealed class PaymentCallbackFilter(PaymentTestState state, IInstanceClient instances) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var payload = context.ActionArguments.Values.OfType<AppCallbackPayload>().SingleOrDefault();
        var result = await next();
        if (payload?.CommandKey is not ("CleanupPayment" or "CompletePayment"))
            return;
        int status = result.Result switch
        {
            ObjectResult objectResult => objectResult.StatusCode ?? 200,
            StatusCodeResult statusResult => statusResult.StatusCode,
            _ => result.Exception is null ? 200 : 500,
        };
        if (status is >= 200 and < 300 && state.LoseResponse(payload.CommandKey))
        {
            var route = context.RouteData.Values;
            var instance = await instances.GetInstance(
                route["app"]!.ToString()!,
                route["org"]!.ToString()!,
                int.Parse(route["instanceOwnerPartyId"]!.ToString()!),
                Guid.Parse(route["instanceGuid"]!.ToString()!),
                StorageAuthenticationMethod.ServiceOwner(),
                context.HttpContext.RequestAborted
            );
            state.Receipt(instance.Data.SingleOrDefault(x => x.DataType == "payment-receipt")?.Id);
            result.Result = new ObjectResult(new { message = "Lost callback response after Storage commit." })
            {
                StatusCode = 500,
            };
            status = 500;
        }
        state.Callback(new(payload.CommandKey, payload.WorkflowId, payload.StepId, payload.RetryCount, status));
    }
}
