using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;

namespace Altinn.App.Integration.Tests;

public sealed partial class AppFixture
{
    internal readonly record struct ReadResult<T>(T? Model, string? Body, Exception? Exception);

    internal sealed class ReadApiResponse<T>(AppFixture fixture, HttpResponseMessage response, ReadResult<T> data)
        : ApiResponse(fixture, response)
    {
        public ReadResult<T> Data { get; } = data;

        public bool IncludeBodyInSnapshot { get; set; } = true;

        public override SettingsTask Verify(Scrubbers? scrubbers = null, [CallerFilePath] string sourceFile = "") =>
            VerifyInternal(scrubbers, sourceFile);

        private SettingsTask VerifyInternal(Scrubbers? scrubbers = null, [CallerFilePath] string sourceFile = "")
        {
            var appPort = Fixture._appContainer.GetMappedPublicPort(AppPort).ToString();
            var localtestPort = Fixture._localtestContainer.GetMappedPublicPort(LocaltestPort).ToString();
            var snapshot = IncludeBodyInSnapshot ? Snapshot.Create(Response, Data) : Snapshot.Create(Response);

            var settings = Verifier
                .Verify(snapshot, sourceFile: sourceFile)
                .AddExtraSettings(settings =>
                {
                    settings.Converters.Add(new StringConverter(appPort, localtestPort, scrubbers));
                    settings.Converters.Add(new HeadersConverter(appPort, localtestPort, scrubbers));
                    settings.Converters.Add(new UriConverter(appPort, localtestPort, scrubbers));
                });
            return settings;
        }
    }

    internal class ApiResponse(AppFixture fixture, HttpResponseMessage response) : IDisposable
    {
        public AppFixture Fixture = fixture;
        private HttpResponseMessage? _response = response;
        public HttpResponseMessage Response
        {
            get
            {
                Assert.NotNull(_response);
                return _response;
            }
        }

        public async Task<ReadApiResponse<T>> Read<T>()
        {
            string? body = null;
            T? model = default;
            Exception? exception = null;
            var response = Response;
            try
            {
                var rawBody = await response.Content.ReadAsByteArrayAsync();
                body = Encoding.UTF8.GetString(rawBody);
                if (typeof(T) == typeof(Argon.JToken))
                {
                    // Argon is being used by VerifyTests for JSON
                    model = (T)(object)Argon.JToken.Parse(body);
                }
                else if (typeof(T) == typeof(string))
                {
                    model = (T)(object)body;
                }
                else if (typeof(T) == typeof(byte[]))
                {
                    model = (T)(object)rawBody;
                }
                else
                {
                    model = JsonSerializer.Deserialize<T>(body, _jsonSerializerOptions);
                }
            }
            catch (Exception ex)
            {
                exception = ex;
            }
            _response = null; // We give ownership of the response to the generic ReadApiResponse<T> below
            return new ReadApiResponse<T>(Fixture, response, new(model, body, exception));
        }

        public virtual SettingsTask Verify(Scrubbers? scrubbers = null, [CallerFilePath] string sourceFile = "")
        {
            var appPort = Fixture._appContainer.GetMappedPublicPort(AppPort).ToString();
            var localtestPort = Fixture._localtestContainer.GetMappedPublicPort(LocaltestPort).ToString();
            var settings = Verifier
                .Verify(Snapshot.Create(Response), sourceFile: sourceFile)
                .AddExtraSettings(settings =>
                {
                    settings.Converters.Add(new StringConverter(appPort, localtestPort, scrubbers));
                    settings.Converters.Add(new HeadersConverter(appPort, localtestPort, scrubbers));
                    settings.Converters.Add(new UriConverter(appPort, localtestPort, scrubbers));
                });
            return settings;
        }

        public void Dispose() => _response?.Dispose();
    }

    private sealed record Snapshot(HttpResponseMessage HttpResponse, object? Response)
    {
        public static Snapshot Create(HttpResponseMessage httpResponse) => new Snapshot(httpResponse, null);

        public static Snapshot Create<T>(HttpResponseMessage httpResponse, ReadResult<T> data)
        {
            object? response = data switch
            {
                { Model: not null } => data.Model,
                { Body: not null } => data.Body,
                _ => data.Exception?.ToString(),
            };
            return new Snapshot(httpResponse, response);
        }
    }

    private sealed class StringConverter(string _appPort, string _localtestPort, Scrubbers? _scrubbers)
        : WriteOnlyJsonConverter<string>
    {
        public override void Write(VerifyJsonWriter writer, string value)
        {
            if (_scrubbers?.StringScrubber is { } scrubber)
                value = scrubber(value);
            value = value.Replace(_appPort, "<appPort>");
            value = value.Replace(_localtestPort, "<localtestPort>");
            writer.WriteValue(value);
        }
    }

    private sealed class HeadersConverter(string _appPort, string _localtestPort, Scrubbers? _scrubbers)
        : WriteOnlyJsonConverter<HttpHeaders>
    {
        public override void Write(VerifyJsonWriter writer, HttpHeaders headers)
        {
            writer.WriteStartObject();
            foreach (var kvp in headers)
            {
                var (key, values) = kvp;
                if (_scrubbers?.HeadersScrubber is { } headersScrubber)
                {
                    if (headersScrubber((key, values)) is not { } scrubbed)
                        continue; // Skip this header if it was scrubbed to null
                    (key, values) = scrubbed;
                }

                writer.WritePropertyName(key);

                switch (key)
                {
                    case "Date":
                        writer.WriteValue("<date>");
                        break;
                    case "Authorization":
                        writer.WriteStartArray();
                        foreach (var headerValue in values)
                        {
                            var firstWhitespaceIndex = headerValue.IndexOf(' ');
                            if (firstWhitespaceIndex != -1)
                                writer.WriteValue($"{headerValue[..firstWhitespaceIndex]} <token>");
                            else
                                writer.WriteValue("<token>");
                        }
                        writer.WriteEndArray();
                        break;
                    default:
                        writer.WriteStartArray();
                        foreach (var headerValue in values)
                        {
                            string v = headerValue;
                            if (_scrubbers?.StringScrubber is { } scrubber)
                                v = scrubber(v);
                            v = v.Replace(_appPort, "<appPort>");
                            v = v.Replace(_localtestPort, "<localtestPort>");
                            writer.WriteValue(v);
                        }
                        writer.WriteEndArray();
                        break;
                }
            }
            writer.WriteEndObject();
        }
    }

    private sealed class UriConverter(string _appPort, string _localtestPort, Scrubbers? _scrubbers)
        : WriteOnlyJsonConverter<Uri>
    {
        public override void Write(VerifyJsonWriter writer, Uri value)
        {
            var uri = value.ToString();
            if (_scrubbers?.StringScrubber is { } scrubber)
                uri = scrubber(uri);
            uri = uri.Replace(_appPort, "<appPort>");
            uri = uri.Replace(_localtestPort, "<localtestPort>");
            writer.WriteValue(uri);
        }
    }
}
