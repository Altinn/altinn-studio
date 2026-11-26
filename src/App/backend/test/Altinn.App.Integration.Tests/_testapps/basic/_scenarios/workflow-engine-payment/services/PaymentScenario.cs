using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Payment;
using Altinn.App.Core.Features.Payment.Models;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

#nullable enable

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEnginePayment;

/// <summary>
/// An order of 125 NOK, paid with the app library's fake payment processor, which reports every payment as paid.
/// </summary>
public sealed class PaymentScenarioOrder : IOrderDetailsCalculator
{
    public Task<OrderDetails> CalculateOrderDetails(
        Instance instance,
        string? language,
        CancellationToken cancellationToken = default
    ) =>
        Task.FromResult(
            new OrderDetails
            {
                PaymentProcessorId = "Fake Payment Processor",
                Currency = "NOK",
                Receiver = new PaymentReceiver(),
                OrderLines =
                [
                    new PaymentOrderLine
                    {
                        Id = "fee",
                        Name = "Fee",
                        PriceExVat = 100,
                        Quantity = 1,
                        VatPercent = 25,
                    },
                ],
            }
        );
}

/// <summary>
/// The payment task stores a receipt when it ends. The scenario has no page to print, so the receipt is a stub.
/// </summary>
public sealed class PaymentScenarioReceipt : IPdfService
{
    public Task<byte[]> GeneratePdf(
        Instance instance,
        string taskId,
        string language,
        List<string>? autoGeneratePdfForTaskIds = null,
        bool isPreview = false,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) => Task.FromResult("%PDF-1.4 receipt"u8.ToArray());

    public Task<byte[]> GenerateSubformPdf(
        Instance instance,
        string taskId,
        SubformPdfContext subformPdfContext,
        string language,
        bool isPreview = false,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) => Task.FromResult("%PDF-1.4 receipt"u8.ToArray());

    public static void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<IOrderDetailsCalculator, PaymentScenarioOrder>();
        services.AddSingleton<IPdfService, PaymentScenarioReceipt>();
        services.Configure<MvcOptions>(options => options.Filters.Add<LoseReceiverAnswerFilter>());
        services.AddSingleton<IEndpointConfigurator, LoseReceiverAnswerEndpoints>();
    }
}

/// <summary>
/// Once armed, answers the next callback of a step that handles a message to a payment attempt with a 500 after the
/// callback ran in full, saved and relayed, so the workflow engine runs the step again.
/// </summary>
public sealed class LoseReceiverAnswerFilter : IAsyncActionFilter
{
    private static int _armed;
    private static int _receiverRuns;

    public static void Arm()
    {
        Interlocked.Exchange(ref _receiverRuns, 0);
        Interlocked.Exchange(ref _armed, 1);
    }

    public static int ReceiverRuns => Volatile.Read(ref _receiverRuns);

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        bool isReceiver =
            context.ActionArguments.TryGetValue("payload", out object? payload)
            && payload is AppCallbackPayload { CommandKey: "ExecuteServiceTask", Mailbox.Delivery: not null };
        ActionExecutedContext executed = await next();
        if (!isReceiver)
        {
            return;
        }

        Interlocked.Increment(ref _receiverRuns);
        if (executed.Result is OkObjectResult && Interlocked.Exchange(ref _armed, 0) == 1)
        {
            executed.Result = new ObjectResult(new ProblemDetails { Title = "The answer was lost." })
            {
                StatusCode = StatusCodes.Status500InternalServerError,
            };
        }
    }
}

public sealed class LoseReceiverAnswerEndpoints : IEndpointConfigurator
{
    public void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost(
            "/test/workflow-engine-payment/lose-next-receiver-answer",
            () =>
            {
                LoseReceiverAnswerFilter.Arm();
                return Results.Ok();
            }
        );
        app.MapGet(
            "/test/workflow-engine-payment/state",
            () => Results.Ok(new { receiverRuns = LoseReceiverAnswerFilter.ReceiverRuns })
        );
    }
}
