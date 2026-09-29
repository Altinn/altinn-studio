namespace Altinn.Studio.AppConfig.Validation;

public enum Severity
{
    None = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
}

public static class SeverityExtensions
{
    public static string ToToken(this Severity s) =>
        s switch
        {
            Severity.Error => "error",
            Severity.Warning => "warning",
            Severity.Info => "info",
            _ => "unknown",
        };

    public static bool TryParse(string token, out Severity severity)
    {
        switch (token)
        {
            case "error":
                severity = Severity.Error;
                return true;
            case "warning":
                severity = Severity.Warning;
                return true;
            case "info":
                severity = Severity.Info;
                return true;
            default:
                severity = Severity.None;
                return false;
        }
    }
}
