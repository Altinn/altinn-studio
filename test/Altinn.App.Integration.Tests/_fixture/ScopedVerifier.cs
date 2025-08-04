using System.Reflection;
using System.Runtime.CompilerServices;

namespace Altinn.App.Integration.Tests;

/// <summary>
/// A scoped verifier that automatically increments snapshot indices and formats parameter strings.
/// Create a new instance for each test method to get auto-incrementing snapshot numbering.
/// </summary>
internal sealed class ScopedVerifier
{
    private int _index = 0;
    private readonly AppFixture _fixture;

    internal ScopedVerifier(AppFixture fixture)
    {
        _fixture = fixture;
    }

    public SettingsTask Verify<T>(
        AppFixture.ReadApiResponse<T> response,
        object? parameters = null,
        string? snapshotName = null,
        Func<string, string>? scrubber = null,
        [CallerFilePath] string sourceFile = ""
    )
    {
        try
        {
            var parameterString = BuildParameterString(_index++, parameters, snapshotName);

            return response.Verify(scrubber, sourceFile).UseTextForParameters(parameterString);
        }
        catch (Exception)
        {
            _fixture.TestErrored = true;
            throw;
        }
    }

    public SettingsTask Verify(
        AppFixture.ApiResponse response,
        object? parameters = null,
        string? snapshotName = null,
        Func<string, string>? scrubber = null,
        [CallerFilePath] string sourceFile = ""
    )
    {
        try
        {
            var parameterString = BuildParameterString(_index++, parameters, snapshotName);

            return response.Verify(scrubber, sourceFile).UseTextForParameters(parameterString);
        }
        catch (Exception)
        {
            _fixture.TestErrored = true;
            throw;
        }
    }

    public SettingsTask Verify<T>(
        T target,
        object? parameters = null,
        string? snapshotName = null,
        [CallerFilePath] string sourceFile = ""
    )
    {
        try
        {
            var parameterString = BuildParameterString(_index++, parameters, snapshotName);

            return Verifier.Verify(target, sourceFile: sourceFile).UseTextForParameters(parameterString);
        }
        catch (Exception)
        {
            _fixture.TestErrored = true;
            throw;
        }
    }

    private static string BuildParameterString(int index, object? parameters, string? snapshotName)
    {
        var parts = new List<string> { index.ToString() };

        if (parameters != null)
        {
            parts.Add(FormatParameters(parameters));
        }

        if (!string.IsNullOrEmpty(snapshotName))
        {
            parts.Add(snapshotName);
        }

        return string.Join("_", parts);
    }

    private static string FormatParameters(object parameters)
    {
        return parameters switch
        {
            string str => str,
            _ => FormatAnonymousObject(parameters),
        };
    }

    private static string FormatAnonymousObject(object obj)
    {
        var properties = obj.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);
        var parts = properties
            .OrderBy(p => p.Name) // Ensure consistent ordering
            .Select(p => $"{p.Name}={p.GetValue(obj)}");
        return string.Join("_", parts);
    }
}
