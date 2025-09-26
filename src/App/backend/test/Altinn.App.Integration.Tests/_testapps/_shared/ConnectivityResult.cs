using System;

#nullable enable

namespace TestApp.Shared;

public class ConnectivityResult
{
    public bool Success { get; set; }
    public int StatusCode { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ResponseContent { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
}
