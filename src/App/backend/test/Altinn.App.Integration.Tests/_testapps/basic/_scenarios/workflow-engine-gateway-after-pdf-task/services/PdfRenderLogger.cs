using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Pdf;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

#nullable enable

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineGatewayAfterPdfTask;

/// <summary>
/// Logs every PDF render before handing it to the real generator, so the test can count renders: a
/// transition that fails after the PDF task and is retried renders the PDF again, which the number of PDF
/// data elements does not show.
/// </summary>
public sealed class PdfRenderLogger(IPdfGeneratorClient inner) : IPdfGeneratorClient
{
    public const string RenderLogMessage = "PdfGeneratorClient.GeneratePdf";

    public Task<Stream> GeneratePdf(Uri uri, CancellationToken cancellationToken)
    {
        SnapshotLogger.LogInfo(RenderLogMessage);
        return inner.GeneratePdf(uri, cancellationToken);
    }

    public Task<Stream> GeneratePdf(Uri uri, string? footerContent, CancellationToken cancellationToken)
    {
        SnapshotLogger.LogInfo(RenderLogMessage);
        return inner.GeneratePdf(uri, footerContent, cancellationToken);
    }

    public Task<Stream> GeneratePdf(
        Uri uri,
        string? footerContent,
        StorageAuthenticationMethod? authenticationMethod,
        CancellationToken cancellationToken
    )
    {
        SnapshotLogger.LogInfo(RenderLogMessage);
        return inner.GeneratePdf(uri, footerContent, authenticationMethod, cancellationToken);
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        ServiceDescriptor original = services.Last(descriptor => descriptor.ServiceType == typeof(IPdfGeneratorClient));
        Func<IServiceProvider, object> createOriginal =
            original.ImplementationFactory
            ?? throw new InvalidOperationException("The PDF generator client is expected to be a typed HttpClient.");
        services.Remove(original);
        services.AddTransient<IPdfGeneratorClient>(provider => new PdfRenderLogger(
            (IPdfGeneratorClient)createOriginal(provider)
        ));
    }
}
