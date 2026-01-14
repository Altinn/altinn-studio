# OpenTelemetry Distributed Tracing Guide for .NET
## Preserving Trace Context Across Threads and Background Jobs

This guide demonstrates how to properly handle trace context when work is initiated in one thread (e.g., an API endpoint) and processed later on a different thread (e.g., a background job or queued task) using OpenTelemetry in .NET.

## Table of Contents
1. [OpenTelemetry Setup](#step-1-opentelemetry-setup)
2. [Configure OpenTelemetry in Program.cs](#step-2-configure-opentelemetry-in-programcs)
3. [Service for Managing Trace Context](#step-3-service-for-managing-trace-context)
4. [Capture Context at Endpoint](#step-4-capture-context-at-endpoint)
5. [Restore Context in Background Processor](#step-5-restore-context-in-background-processor)
6. [Enhanced HTTP Client with Custom Spans](#step-6-enhanced-http-client-with-custom-spans)
7. [Add Baggage for Cross-Cutting Concerns](#step-7-add-baggage-for-cross-cutting-concerns)
8. [Testing Your Traces](#testing-your-traces)

## Step 1: OpenTelemetry Setup

First, install the necessary NuGet packages:

```xml
<PackageReference Include="OpenTelemetry" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Exporter.Console" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.10.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.10.0" />
```

## Step 2: Configure OpenTelemetry in Program.cs

```csharp
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

// Define your ActivitySource (this is what OpenTelemetry will listen to)
public static class Telemetry
{
    public static readonly string ServiceName = "MyService";
    public static readonly string ServiceVersion = "1.0.0";

    public static readonly ActivitySource ActivitySource =
        new(ServiceName, ServiceVersion);
}

// Configure OpenTelemetry
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(
            serviceName: Telemetry.ServiceName,
            serviceVersion: Telemetry.ServiceVersion))
    .WithTracing(tracing => tracing
        .AddSource(Telemetry.ServiceName)  // Listen to our ActivitySource
        .AddAspNetCoreInstrumentation()    // Auto-instrument ASP.NET Core
        .AddHttpClientInstrumentation()    // Auto-instrument HttpClient
        .SetSampler(new AlwaysOnSampler()) // Sample everything (adjust for production)
        .AddConsoleExporter()               // For development
        .AddOtlpExporter(opt =>            // For production (Jaeger, Tempo, etc.)
        {
            opt.Endpoint = new Uri("http://localhost:4317"); // Your OTLP collector
        }));

builder.Services.AddHttpClient();
```

## Step 3: Service for Managing Trace Context

```csharp
public class StoredTraceContext
{
    public string TraceId { get; set; }
    public string SpanId { get; set; }
    public string TraceState { get; set; }
    public TraceFlags TraceFlags { get; set; }
    public Dictionary<string, string> Baggage { get; set; } = new();

    // Helper property for W3C format
    public string TraceParent =>
        $"00-{TraceId}-{SpanId}-{((int)TraceFlags).ToString("x2")}";
}

public interface ITraceContextService
{
    StoredTraceContext CaptureCurrentContext();
    Activity? RestoreContext(StoredTraceContext context, string operationName);
}

public class TraceContextService : ITraceContextService
{
    public StoredTraceContext CaptureCurrentContext()
    {
        var activity = Activity.Current;
        if (activity == null) return null;

        var context = new StoredTraceContext
        {
            TraceId = activity.TraceId.ToString(),
            SpanId = activity.SpanId.ToString(),
            TraceState = activity.TraceStateString,
            TraceFlags = activity.ActivityTraceFlags
        };

        // Capture OpenTelemetry Baggage
        foreach (var baggage in Baggage.Current)
        {
            context.Baggage[baggage.Key] = baggage.Value;
        }

        return context;
    }

    public Activity? RestoreContext(StoredTraceContext context, string operationName)
    {
        if (context == null) return null;

        // Restore baggage first
        foreach (var item in context.Baggage)
        {
            Baggage.Current.SetBaggage(item.Key, item.Value);
        }

        // Create ActivityContext from stored values
        var traceId = ActivityTraceId.CreateFromString(context.TraceId.AsSpan());
        var spanId = ActivitySpanId.CreateFromString(context.SpanId.AsSpan());

        var parentContext = new ActivityContext(
            traceId,
            spanId,
            (ActivityTraceFlags)context.TraceFlags,
            context.TraceState,
            isRemote: true);  // Mark as remote since it's from a different execution context

        // Start new activity with the parent context
        var activity = Telemetry.ActivitySource.StartActivity(
            operationName,
            ActivityKind.Internal,
            parentContext);

        return activity;
    }
}

// Register the service
builder.Services.AddSingleton<ITraceContextService, TraceContextService>();
```

## Step 4: Capture Context at Endpoint

```csharp
app.MapPost("/trigger-work", async (
    ITraceContextService traceService,
    MyDbContext db,
    IMessageQueue queue) =>
{
    // Create a span for this operation
    using var activity = Telemetry.ActivitySource.StartActivity("TriggerWork");

    // Add OpenTelemetry attributes
    activity?.SetTag("work.type", "async_processing");
    activity?.SetTag("queue.name", "work-items");

    // Capture the current context
    var traceContext = traceService.CaptureCurrentContext();

    var workItem = new WorkItem
    {
        Id = Guid.NewGuid(),
        TraceContext = JsonSerializer.Serialize(traceContext),
        CreatedAt = DateTime.UtcNow,
        Status = "Queued"
    };

    // Add work item ID to current span
    activity?.SetTag("work.item.id", workItem.Id);

    try
    {
        await db.WorkItems.AddAsync(workItem);
        await db.SaveChangesAsync();

        await queue.SendAsync(new WorkMessage
        {
            WorkItemId = workItem.Id,
            TraceContext = traceContext
        });

        activity?.SetStatus(ActivityStatusCode.Ok);
        return Results.Accepted(new { workItemId = workItem.Id });
    }
    catch (Exception ex)
    {
        activity?.RecordException(ex);
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        throw;
    }
});
```

## Step 5: Restore Context in Background Processor

```csharp
public class WorkItemProcessor : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WorkItemProcessor> _logger;

    public WorkItemProcessor(IServiceProvider serviceProvider, ILogger<WorkItemProcessor> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in GetMessages(stoppingToken))
        {
            await ProcessWorkItem(message);
        }
    }

    private async Task ProcessWorkItem(WorkMessage message)
    {
        using var scope = _serviceProvider.CreateScope();
        var traceService = scope.ServiceProvider.GetRequiredService<ITraceContextService>();
        var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();

        // Restore the original trace context
        using var activity = traceService.RestoreContext(
            message.TraceContext,
            "ProcessWorkItem");

        // Add OpenTelemetry semantic attributes
        activity?.SetTag("work.item.id", message.WorkItemId);
        activity?.SetTag("messaging.system", "rabbitmq"); // or your queue system
        activity?.SetTag("messaging.operation", "process");

        try
        {
            // Update work item status
            var workItem = await db.WorkItems.FindAsync(message.WorkItemId);
            workItem.Status = "Processing";
            workItem.StartedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            // Make HTTP calls - trace context is automatically propagated!
            using var httpActivity = Telemetry.ActivitySource.StartActivity(
                "ExternalApiCall",
                ActivityKind.Client);

            httpActivity?.SetTag("http.method", "POST");
            httpActivity?.SetTag("http.url", "https://api.example.com/process");

            var client = httpClientFactory.CreateClient();
            var response = await client.PostAsJsonAsync(
                "https://api.example.com/process",
                new { workItemId = message.WorkItemId });

            httpActivity?.SetTag("http.status_code", (int)response.StatusCode);

            if (response.IsSuccessStatusCode)
            {
                workItem.Status = "Completed";
                workItem.CompletedAt = DateTime.UtcNow;
                activity?.SetStatus(ActivityStatusCode.Ok);
            }
            else
            {
                workItem.Status = "Failed";
                activity?.SetStatus(ActivityStatusCode.Error,
                    $"HTTP {response.StatusCode}");
            }

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error processing work item {WorkItemId} with TraceId {TraceId}",
                message.WorkItemId,
                activity?.TraceId.ToString());

            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);

            // Update work item status
            var workItem = await db.WorkItems.FindAsync(message.WorkItemId);
            workItem.Status = "Error";
            workItem.ErrorMessage = ex.Message;
            await db.SaveChangesAsync();

            throw;
        }
    }
}
```

## Step 6: Enhanced HTTP Client with Custom Spans

```csharp
public class InstrumentedHttpService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<InstrumentedHttpService> _logger;

    public InstrumentedHttpService(IHttpClientFactory httpClientFactory,
        ILogger<InstrumentedHttpService> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
    }

    public async Task<T> GetWithTracingAsync<T>(string url)
    {
        // Create a child span with semantic conventions
        using var activity = Telemetry.ActivitySource.StartActivity(
            "HTTP GET",
            ActivityKind.Client);

        // Add OpenTelemetry semantic convention attributes
        activity?.SetTag("http.method", "GET");
        activity?.SetTag("http.url", url);
        activity?.SetTag("http.scheme", "https");
        activity?.SetTag("net.peer.name", new Uri(url).Host);

        // Add custom business attributes
        activity?.SetTag("service.name", "external-api");

        try
        {
            var response = await _httpClient.GetAsync(url);

            activity?.SetTag("http.status_code", (int)response.StatusCode);
            activity?.SetTag("http.response_content_length",
                response.Content.Headers.ContentLength);

            if (response.IsSuccessStatusCode)
            {
                activity?.SetStatus(ActivityStatusCode.Ok);
                var content = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<T>(content);
            }
            else
            {
                activity?.SetStatus(ActivityStatusCode.Error,
                    $"HTTP {response.StatusCode}");
                throw new HttpRequestException($"Request failed: {response.StatusCode}");
            }
        }
        catch (Exception ex)
        {
            activity?.RecordException(ex);
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);

            _logger.LogError(ex,
                "HTTP request failed. TraceId: {TraceId}, SpanId: {SpanId}",
                activity?.TraceId.ToString(),
                activity?.SpanId.ToString());

            throw;
        }
    }
}
```

## Step 7: Add Baggage for Cross-Cutting Concerns

```csharp
app.MapPost("/api/orders", async (OrderRequest request) =>
{
    using var activity = Telemetry.ActivitySource.StartActivity("CreateOrder");

    // Set baggage that will propagate to all downstream services
    Baggage.Current.SetBaggage("user.id", request.UserId);
    Baggage.Current.SetBaggage("tenant.id", request.TenantId);
    Baggage.Current.SetBaggage("request.id", Guid.NewGuid().ToString());

    // These baggage items will be included when you capture context
    // and restored when you restore context later

    activity?.SetTag("order.id", request.OrderId);

    // Process order...

    return Results.Ok();
});
```

## Key Benefits of This OpenTelemetry Approach

1. **Standard Instrumentation**: Uses OpenTelemetry semantic conventions for consistent telemetry data
2. **Auto-instrumentation**: HTTP calls and ASP.NET Core requests are automatically traced
3. **Distributed Tracing**: Full trace visibility across async boundaries and different threads
4. **Vendor Agnostic**: Works with any OpenTelemetry-compatible backend (Jaeger, Tempo, Zipkin, etc.)
5. **Rich Context**: Preserves baggage and trace state across service boundaries
6. **Production Ready**: Includes proper error handling, status codes, and exception recording

## Testing Your Traces

To see your traces locally, you can use Jaeger with Docker:

```bash
# Run Jaeger All-in-One
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Then visit http://localhost:16686 to see your distributed traces with full context preservation across async boundaries!

## Additional Configuration Options

### Sampling Strategies

For production, consider using a more sophisticated sampling strategy:

```csharp
.SetSampler(new TraceIdRatioBasedSampler(0.1)) // Sample 10% of traces
```

### Custom Exporters

You can export to multiple backends:

```csharp
.AddOtlpExporter(opt => opt.Endpoint = new Uri("http://tempo:4317"))
.AddZipkinExporter(opt => opt.Endpoint = new Uri("http://zipkin:9411/api/v2/spans"))
```

### Resource Attributes

Add more context about your service:

```csharp
.ConfigureResource(resource => resource
    .AddService(serviceName: Telemetry.ServiceName, serviceVersion: Telemetry.ServiceVersion)
    .AddAttributes(new Dictionary<string, object>
    {
        ["deployment.environment"] = "production",
        ["service.namespace"] = "my-namespace",
        ["service.instance.id"] = Environment.MachineName
    }))
```

## Summary

This approach ensures that:
- Trace context flows correctly across async boundaries
- Background jobs maintain connection to the original request
- All HTTP calls are properly instrumented
- You have full visibility into your distributed system
- The solution is standards-compliant and vendor-agnostic

The key insight is that by capturing the complete trace context (TraceId, SpanId, TraceState, and Baggage) and properly restoring it with OpenTelemetry's ActivitySource, you maintain the full trace genealogy even when work moves between threads or processes.
