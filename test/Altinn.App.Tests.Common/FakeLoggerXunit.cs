using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Tests.Common;

public static class FakeLoggerXunit
{
    public static IServiceCollection AddFakeLoggingWithXunit(this IServiceCollection services, ITestOutputHelper output)
    {
        services.AddFakeLogging(options =>
        {
            options.OutputFormatter = OutputFormatter;
            options.OutputSink = output.WriteLine;
        });
        return services;
    }

    public static FakeLogger<T> Get<T>(ITestOutputHelper output)
    {
        var options = new FakeLogCollectorOptions()
        {
            OutputFormatter = OutputFormatter,
            OutputSink = output.WriteLine,
        };
        var collector = FakeLogCollector.Create(options);
        { }
        ;
        var logger = new FakeLogger<T>(collector);
        return logger;
    }

    public static string OutputFormatter(FakeLogRecord log)
    {
        return $"""
            [{ShortLogLevel(log.Level)}] {log.Category}:
            {log.Message}{(log.Exception is not null ? "\n" : "")}{log.Exception}

            """;
    }

    private static string ShortLogLevel(LogLevel logLevel) =>
        logLevel switch
        {
            LogLevel.Trace => "trac",
            LogLevel.Debug => "debu",
            LogLevel.Information => "info",
            LogLevel.Warning => "warn",
            LogLevel.Error => "erro",
            LogLevel.Critical => "crit",
            LogLevel.None => "none",
            _ => "????",
        };
}
