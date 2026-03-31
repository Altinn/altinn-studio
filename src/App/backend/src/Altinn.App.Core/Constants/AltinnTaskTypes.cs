namespace Altinn.App.Core.Constants;

/// <summary>
/// Constants for Altinn task types.
/// </summary>
internal static class AltinnTaskTypes
{
    /// <summary>
    /// The payment task type.
    /// </summary>
    public const string Payment = "payment";

    /// <summary>
    /// The signing task type.
    /// </summary>
    public const string Signing = "signing";

    /// <summary>
    /// The data task type for collecting data from the user in a form.
    /// </summary>
    public const string Data = "data";

    /// <summary>
    /// The feedback task type for waiting for a service owner integration to push update the instance.
    /// </summary>
    public const string Feedback = "feedback";

    /// <summary>
    /// Service task type for generating a pdf document.
    /// </summary>
    public const string Pdf = "pdf";

    /// <summary>
    /// The eFormidling task type when waiting for confirmation that the instance has been sent to eFormidling.
    /// </summary>
    public const string EFormidling = "eFormidling";

    /// <summary>
    /// The FiksArkiv task type.
    /// </summary>
    public const string FiksArkiv = "fiksArkiv";

    /// <summary>
    /// The confirmation task type. (Simple version of Sign without creating a signature document)
    /// </summary>
    public const string Confirmation = "confirmation";

    /// <summary>
    /// Service task type for generating pdf documents from a subform.
    /// </summary>
    public const string SubformPdf = "subformPdf";
}
