using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

internal class HttpApiResult<T>
{
    // ReSharper disable once StaticMemberInGenericType
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public HttpApiResult() { }

    public HttpApiResult(T? result, HttpStatusCode status, string? rawError)
    {
        Result = result;
        Status = status;
        RawError = rawError;
    }

    [MemberNotNullWhen(true, nameof(Result))]
    public bool IsSuccess => Result is not null;
    public T? Result { get; init; }
    public HttpStatusCode Status { get; set; }
    public string? RawError { get; init; }

    public static async Task<HttpApiResult<T>> FromHttpResponse(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode)
        {
            if (response.StatusCode == HttpStatusCode.NoContent)
            {
                return new HttpApiResult<T> { Status = response.StatusCode, Result = default };
            }

            try
            {
                return new HttpApiResult<T>
                {
                    Status = response.StatusCode,
                    Result =
                        await response.Content.ReadFromJsonAsync<T>(_jsonSerializerOptions)
                        ?? throw new JsonException("Could not deserialize response"),
                };
            }
            catch (JsonException e)
            {
                return new HttpApiResult<T>() { Status = response.StatusCode, RawError = e.Message };
            }
        }

        return new HttpApiResult<T>
        {
            Status = response.StatusCode,
            RawError = await response.Content.ReadAsStringAsync(),
        };
    }
}
