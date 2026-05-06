using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests.Extensions;

/// <summary>
/// Tests the <see cref="EngineSettings"/> configuration pipeline: JSON binding,
/// environment variable overrides, default fallbacks via PostConfigure, and validation.
/// </summary>
public class EngineSettingsConfigurationTests
{
    /// <summary>
    /// Builds a service provider with EngineSettings bound to the given JSON and optional env vars,
    /// running through the real ConfigureEngine pipeline (bind + defaults + validation).
    /// </summary>
    private static EngineSettings Resolve(string json = "{}", Dictionary<string, string?>? envOverrides = null)
    {
        var configBuilder = new ConfigurationBuilder().AddJsonStream(json.ToJsonStream());

        if (envOverrides is not null)
            configBuilder.AddInMemoryCollection(envOverrides);

        var config = configBuilder.Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(config);
        services.ConfigureEngine("EngineSettings");

        using var sp = services.BuildServiceProvider();
        return sp.GetRequiredService<IOptions<EngineSettings>>().Value;
    }

    [Fact]
    public void EmptyConfig_AllDefaultsApplied()
    {
        var settings = Resolve("""{ "EngineSettings": {} }""");

        // Concurrency
        Assert.Equal(400, settings.Concurrency.MaxWorkers);
        Assert.Equal(90, settings.Concurrency.MaxDbOperations);
        Assert.Equal(400, settings.Concurrency.MaxHttpCalls);

        // Timeouts
        Assert.Equal(TimeSpan.FromSeconds(100), settings.DefaultStepCommandTimeout);
        Assert.Equal(TimeSpan.FromSeconds(30), settings.DatabaseCommandTimeout);

        // Retry strategies
        Assert.NotNull(settings.DefaultStepRetryStrategy);
        Assert.NotNull(settings.DatabaseRetryStrategy);

        // Limits
        Assert.Equal(100, settings.MaxWorkflowsPerRequest);
        Assert.Equal(50, settings.MaxStepsPerWorkflow);
        Assert.Equal(50, settings.MaxLabels);

        // Heartbeat
        Assert.Equal(TimeSpan.FromSeconds(10), settings.HeartbeatInterval);
        Assert.Equal(TimeSpan.FromSeconds(30), settings.StaleWorkflowThreshold);
        Assert.Equal(5, settings.MaxReclaimCount);

        // Write buffer
        Assert.Equal(100, settings.WriteBuffer.MaxBatchSize);
        Assert.Equal(10_000, settings.WriteBuffer.MaxQueueSize);
        Assert.Equal(10, settings.WriteBuffer.FlushConcurrency);

        // Update buffer
        Assert.Equal(1000, settings.UpdateBuffer.MaxBatchSize);
        Assert.Equal(5_000, settings.UpdateBuffer.MaxQueueSize);

        // Retention
        Assert.Equal(TimeSpan.FromDays(60), settings.Retention.RetentionPeriod);
        Assert.Equal(1000, settings.Retention.BatchSize);
        Assert.Equal(TimeSpan.FromHours(2), settings.Retention.Interval);
    }

    [Fact]
    public void PartialConfig_ProvidedValuesHonored_RestDefaulted()
    {
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Concurrency": { "MaxWorkers": 42 },
                "MaxWorkflowsPerRequest": 200
              }
            }
            """
        );

        // Explicitly set
        Assert.Equal(42, settings.Concurrency.MaxWorkers);
        Assert.Equal(200, settings.MaxWorkflowsPerRequest);

        // Defaulted
        Assert.Equal(90, settings.Concurrency.MaxDbOperations);
        Assert.Equal(400, settings.Concurrency.MaxHttpCalls);
        Assert.Equal(TimeSpan.FromSeconds(100), settings.DefaultStepCommandTimeout);
        Assert.Equal(100, settings.WriteBuffer.MaxBatchSize);
        Assert.Equal(1000, settings.UpdateBuffer.MaxBatchSize);
    }

    [Fact]
    public void NestedObjects_BindCorrectly()
    {
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Concurrency": { "MaxWorkers": 10, "MaxDbOperations": 20, "MaxHttpCalls": 30 },
                "WriteBuffer": { "MaxBatchSize": 50, "MaxQueueSize": 500, "FlushConcurrency": 4 },
                "UpdateBuffer": { "MaxBatchSize": 25, "MaxQueueSize": 250 }
              }
            }
            """
        );

        Assert.Equal(10, settings.Concurrency.MaxWorkers);
        Assert.Equal(20, settings.Concurrency.MaxDbOperations);
        Assert.Equal(30, settings.Concurrency.MaxHttpCalls);

        Assert.Equal(50, settings.WriteBuffer.MaxBatchSize);
        Assert.Equal(500, settings.WriteBuffer.MaxQueueSize);
        Assert.Equal(4, settings.WriteBuffer.FlushConcurrency);

        Assert.Equal(25, settings.UpdateBuffer.MaxBatchSize);
        Assert.Equal(250, settings.UpdateBuffer.MaxQueueSize);
    }

    [Fact]
    public void EnvironmentVariableOverride_TakesPrecedenceOverJson()
    {
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Concurrency": { "MaxWorkers": 100 }
              }
            }
            """,
            envOverrides: new()
            {
                ["EngineSettings:Concurrency:MaxWorkers"] = "42",
                ["EngineSettings:WriteBuffer:MaxBatchSize"] = "7",
            }
        );

        Assert.Equal(42, settings.Concurrency.MaxWorkers);
        Assert.Equal(7, settings.WriteBuffer.MaxBatchSize);
    }

    [Fact]
    public void ZeroValues_GetDefaulted_NotRejected()
    {
        // Concurrency properties default to 0 from the record when not bound.
        // PostConfigure should patch them to defaults.
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Concurrency": { "MaxWorkers": 0 },
                "WriteBuffer": { "MaxBatchSize": 0 }
              }
            }
            """
        );

        Assert.Equal(400, settings.Concurrency.MaxWorkers);
        Assert.Equal(100, settings.WriteBuffer.MaxBatchSize);
    }

    [Fact]
    public void Validation_RejectsZeroCommandTimeout_WhenDefaultsBypassed()
    {
        // PostConfigure patches zero/negative → default, so validation only fires
        // if someone registers options without SetEngineSettingsDefaults.
        // This test bypasses PostConfigure to verify validation works independently.
        var services = new ServiceCollection();
        services
            .AddOptions<EngineSettings>()
            .Configure(opts =>
            {
                opts.DefaultStepCommandTimeout = TimeSpan.FromSeconds(-1);
                opts.DatabaseCommandTimeout = TimeSpan.FromSeconds(10);
            })
            .ValidateEngineSettings();

        using var sp = services.BuildServiceProvider();
        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<EngineSettings>>().Value
        );

        Assert.Contains("DefaultStepCommandTimeout", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validation_RejectsZeroDatabaseTimeout_WhenDefaultsBypassed()
    {
        var services = new ServiceCollection();
        services
            .AddOptions<EngineSettings>()
            .Configure(opts =>
            {
                opts.DefaultStepCommandTimeout = TimeSpan.FromSeconds(10);
                opts.DatabaseCommandTimeout = TimeSpan.FromSeconds(-1);
            })
            .ValidateEngineSettings();

        using var sp = services.BuildServiceProvider();
        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<EngineSettings>>().Value
        );

        Assert.Contains("DatabaseCommandTimeout", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void NegativeTimeouts_GetDefaulted_WhenPipelineUsed()
    {
        // When using the full pipeline (PostConfigure + Validate), negative values
        // are patched to defaults before validation runs.
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "DefaultStepCommandTimeout": "-00:00:01",
                "DatabaseCommandTimeout": "-00:00:01"
              }
            }
            """
        );

        Assert.Equal(TimeSpan.FromSeconds(100), settings.DefaultStepCommandTimeout);
        Assert.Equal(TimeSpan.FromSeconds(30), settings.DatabaseCommandTimeout);
    }

    [Fact]
    public void WriteAndUpdateBuffers_GetIndependentDefaults()
    {
        var settings = Resolve("""{ "EngineSettings": {} }""");

        // WriteBuffer and UpdateBuffer have different default MaxBatchSize/MaxQueueSize
        Assert.Equal(100, settings.WriteBuffer.MaxBatchSize);
        Assert.Equal(10_000, settings.WriteBuffer.MaxQueueSize);

        Assert.Equal(1000, settings.UpdateBuffer.MaxBatchSize);
        Assert.Equal(5_000, settings.UpdateBuffer.MaxQueueSize);
    }

    [Fact]
    public void EmptyConfig_RetentionDefaultsApplied()
    {
        var settings = Resolve("""{ "EngineSettings": {} }""");

        Assert.Equal(TimeSpan.FromDays(60), settings.Retention.RetentionPeriod);
        Assert.Equal(1000, settings.Retention.BatchSize);
        Assert.Equal(TimeSpan.FromHours(2), settings.Retention.Interval);
    }

    [Fact]
    public void RetentionConfig_ProvidedValuesHonored()
    {
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Retention": {
                  "RetentionPeriod": "7.00:00:00",
                  "BatchSize": 500,
                  "Interval": "00:30:00"
                }
              }
            }
            """
        );

        Assert.Equal(TimeSpan.FromDays(7), settings.Retention.RetentionPeriod);
        Assert.Equal(500, settings.Retention.BatchSize);
        Assert.Equal(TimeSpan.FromMinutes(30), settings.Retention.Interval);
    }

    [Fact]
    public void RetentionZeroValues_GetDefaulted()
    {
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Retention": {
                  "RetentionPeriod": "00:00:00",
                  "BatchSize": 0,
                  "Interval": "00:00:00"
                }
              }
            }
            """
        );

        Assert.Equal(TimeSpan.FromDays(60), settings.Retention.RetentionPeriod);
        Assert.Equal(1000, settings.Retention.BatchSize);
        Assert.Equal(TimeSpan.FromHours(2), settings.Retention.Interval);
    }

    [Fact]
    public void Validation_RejectsNegativeRetentionPeriod_WhenDefaultsBypassed()
    {
        var services = new ServiceCollection();
        services
            .AddOptions<EngineSettings>()
            .Configure(opts =>
            {
                opts.DefaultStepCommandTimeout = TimeSpan.FromSeconds(10);
                opts.DatabaseCommandTimeout = TimeSpan.FromSeconds(10);
                opts.HeartbeatInterval = TimeSpan.FromSeconds(5);
                opts.StaleWorkflowThreshold = TimeSpan.FromSeconds(10);
                opts.Retention.RetentionPeriod = TimeSpan.FromSeconds(-1);
                opts.Retention.BatchSize = 100;
                opts.Retention.Interval = TimeSpan.FromMinutes(1);
            })
            .ValidateEngineSettings();

        using var sp = services.BuildServiceProvider();
        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<EngineSettings>>().Value
        );

        Assert.Contains("RetentionPeriod", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validation_RejectsZeroRetentionBatchSize_WhenDefaultsBypassed()
    {
        var services = new ServiceCollection();
        services
            .AddOptions<EngineSettings>()
            .Configure(opts =>
            {
                opts.DefaultStepCommandTimeout = TimeSpan.FromSeconds(10);
                opts.DatabaseCommandTimeout = TimeSpan.FromSeconds(10);
                opts.HeartbeatInterval = TimeSpan.FromSeconds(5);
                opts.StaleWorkflowThreshold = TimeSpan.FromSeconds(10);
                opts.Retention.RetentionPeriod = TimeSpan.FromDays(7);
                opts.Retention.BatchSize = 0;
                opts.Retention.Interval = TimeSpan.FromMinutes(1);
            })
            .ValidateEngineSettings();

        using var sp = services.BuildServiceProvider();
        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<EngineSettings>>().Value
        );

        Assert.Contains("BatchSize", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validation_RejectsNegativeRetentionInterval_WhenDefaultsBypassed()
    {
        var services = new ServiceCollection();
        services
            .AddOptions<EngineSettings>()
            .Configure(opts =>
            {
                opts.DefaultStepCommandTimeout = TimeSpan.FromSeconds(10);
                opts.DatabaseCommandTimeout = TimeSpan.FromSeconds(10);
                opts.HeartbeatInterval = TimeSpan.FromSeconds(5);
                opts.StaleWorkflowThreshold = TimeSpan.FromSeconds(10);
                opts.Retention.RetentionPeriod = TimeSpan.FromDays(7);
                opts.Retention.BatchSize = 100;
                opts.Retention.Interval = TimeSpan.FromSeconds(-1);
            })
            .ValidateEngineSettings();

        using var sp = services.BuildServiceProvider();
        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<EngineSettings>>().Value
        );

        Assert.Contains("Interval", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void RetentionEnvironmentOverride_TakesPrecedence()
    {
        var settings = Resolve(
            """
            {
              "EngineSettings": {
                "Retention": { "BatchSize": 500 }
              }
            }
            """,
            envOverrides: new() { ["EngineSettings:Retention:BatchSize"] = "200" }
        );

        Assert.Equal(200, settings.Retention.BatchSize);
    }
}

/// <summary>
/// Helper to convert a JSON string to a stream for <c>ConfigurationBuilder.AddJsonStream</c>.
/// </summary>
internal static class JsonStreamHelper
{
    public static Stream ToJsonStream(this string json) => new MemoryStream(System.Text.Encoding.UTF8.GetBytes(json));
}
