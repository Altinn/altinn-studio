using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

internal static class GeneratedProcessDataTypes
{
    private static readonly XNamespace s_altinn = "http://altinn.no/process";

    internal static readonly IReadOnlyList<string> Tags =
    [
        "signatureDataType",
        "signeeStatesDataTypeId",
        "signingPdfDataType",
        "paymentDataType",
        "paymentReceiptPdfDataType",
    ];

    internal static IEnumerable<XElement> Elements(XElement task) =>
        task.Descendants()
            .Where(element =>
                element.Name.Namespace == s_altinn
                && Tags.Contains(element.Name.LocalName)
                && !string.IsNullOrWhiteSpace(element.Value)
            );
}
