namespace Altinn.Studio.AppConfig.Models;

internal static class ProcessTaskTypes
{
    public const string Data = "data";
    public const string Confirmation = "confirmation";
    public const string Feedback = "feedback";
    public const string Signing = "signing";
    public const string Payment = "payment";
    public const string Pdf = "pdf";
    public const string EFormidling = "eFormidling";
    public const string FiksArkiv = "fiksArkiv";
    public const string SubformPdf = "subformPdf";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Data,
        Confirmation,
        Feedback,
        Signing,
        Payment,
        Pdf,
        EFormidling,
        FiksArkiv,
        SubformPdf,
    };
}
