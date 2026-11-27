using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class TelemetrySettingsMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => TelemetrySettingsMigration.Migrate(Path.Combine(_app.Root, "App"));

    [Fact]
    public async Task Removes_the_template_settings_and_keeps_the_rest_of_the_file()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime",
                "UseOpenTelemetry": true
              },
              // Platform
              "PlatformSettings": {
                "SubscriptionKey": "retrieved from environment at runtime"
              },
              "ApplicationInsights": {
                "InstrumentationKey": "retrieved from environment at runtime"
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Empty(result.Warnings);
        Assert.Equal(2, result.Messages.Count);
        Assert.Equal(
            """
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime"
              },
              // Platform
              "PlatformSettings": {
                "SubscriptionKey": "retrieved from environment at runtime"
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Removes_top_level_otel_keys_and_says_what_they_held()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "AppSettings": {
                "OTEL_SERVICE_NAME": "nested keys are not the SDK's"
              },
              "OTEL_RESOURCE_ATTRIBUTES": "deployment.environment=Local",
              "OTEL_METRICS_EXPORTER": "otlp",
              "otel_logs_exporter": "otlp",
              "OpenTelemetry": {
                "ElasticExporter": { "Endpoint": "https://elastic.example" }
              }
            }
            """
        );
        _app.Write(
            "appsettings.Production.json",
            """
            {
              "OTEL_RESOURCE_ATTRIBUTES": "deployment.environment=Production"
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(4, result.Warnings.Count);
        Assert.Contains(
            result.Warnings,
            w =>
                w.StartsWith(
                    "Removed OTEL_RESOURCE_ATTRIBUTES = \"deployment.environment=Production\" from appsettings.Production.json",
                    StringComparison.Ordinal
                )
        );
        Assert.Equal(
            """
            {
              "AppSettings": {
                "OTEL_SERVICE_NAME": "nested keys are not the SDK's"
              },
              "OpenTelemetry": {
                "ElasticExporter": { "Endpoint": "https://elastic.example" }
              }
            }
            """,
            _app.Read("appsettings.json")
        );
        Assert.Equal(
            """
            {
            }
            """,
            _app.Read("appsettings.Production.json")
        );
    }

    [Fact]
    public async Task Removes_a_section_followed_by_another_with_its_own_comma()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "applicationInsights": { // the key
                "ConnectionString": "InstrumentationKey=00000000-0000-0000-0000-000000000000", /* old */
                "InstrumentationKey": "00000000-0000-0000-0000-000000000000"
              },
              "A": 1
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("no longer read", StringComparison.Ordinal));
        Assert.Equal(
            """
            {
              "A": 1
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Keeps_crlf_line_endings_the_byte_order_mark_and_a_trailing_comment()
    {
        byte[] bom = [0xEF, 0xBB, 0xBF];
        _app.WriteBytes(
            "appsettings.Production.json",
            [
                .. bom,
                .. "{\r\n  \"A\": 1, // a\r\n  \"ApplicationInsights\": {\r\n    \"InstrumentationKey\": \"x\"\r\n  }\r\n}\r\n"u8,
            ]
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal([.. bom, .. "{\r\n  \"A\": 1 // a\r\n}\r\n"u8], _app.ReadBytes("appsettings.Production.json"));
    }

    [Fact]
    public async Task Removes_the_application_insights_logger_settings_and_names_the_level()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "Logging": {
                "LogLevel": {
                  "Default": "Warning"
                },
                "ApplicationInsights": {
                  "LogLevel": {
                    "Default": "Information",
                    "Microsoft": "Warning"
                  }
                }
              },
              "MyIntegration": {
                "ApplicationInsights": { "Key": "kept" }
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Logging:ApplicationInsights", warning, StringComparison.Ordinal);
        Assert.Contains("Default was Information", warning, StringComparison.Ordinal);
        Assert.Equal(
            """
            {
              "Logging": {
                "LogLevel": {
                  "Default": "Warning"
                }
              },
              "MyIntegration": {
                "ApplicationInsights": { "Key": "kept" }
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Removes_a_section_sharing_its_line()
    {
        _app.Write(
            "appsettings.json",
            """{ "ApplicationInsights": { "InstrumentationKey": "retrieved from environment at runtime" }, "A": 1 }"""
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal("""{ "A": 1 }""", _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Removes_the_only_section()
    {
        _app.Write("appsettings.json", "{\n  \"ApplicationInsights\": {}\n}\n");

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal("{\n}\n", _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Says_when_the_app_had_opted_out_of_open_telemetry()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "AppSettings": {
                "UseOpenTelemetry": false,
                "UseOpenTelemetryCollector": true
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("UseOpenTelemetry = false", warning, StringComparison.Ordinal);
        Assert.Equal(
            """
            {
              "AppSettings": {
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Leaves_a_section_spelled_twice_with_a_to_do()
    {
        const string content = """
            {
              "ApplicationInsights": { "InstrumentationKey": "a" },
              "applicationinsights": { "InstrumentationKey": "b" }
            }
            """;
        _app.Write("appsettings.json", content);

        var result = await Migrate();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Contains(result.Todos, t => t.Contains("the ApplicationInsights section", StringComparison.Ordinal));
        Assert.Equal(content, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Leaves_files_without_telemetry_settings_and_files_it_cannot_read_alone()
    {
        const string content = """{ "AppSettings": { "A": 1 } }""";
        _app.Write("appsettings.json", content);
        _app.Write("appsettings.Staging.json", "not json");
        byte[] notUtf8 = [.. "{ \"ApplicationInsights\": { \"K\": \""u8, 0xFF, .. "\" } }"u8];
        _app.WriteBytes("appsettings.Test.json", notUtf8);

        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(content, _app.Read("appsettings.json"));
        Assert.Equal(notUtf8, _app.ReadBytes("appsettings.Test.json"));
    }
}
