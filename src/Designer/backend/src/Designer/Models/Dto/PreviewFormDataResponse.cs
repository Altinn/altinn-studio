using System.Collections.Generic;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>The form data of an instance in preview, by data element.</summary>
/// <param name="DataElements">The instance's form data elements.</param>
public record PreviewFormDataResponse(IReadOnlyList<PreviewFormDataElement> DataElements);

/// <summary>A form data element of an instance in preview, and its data.</summary>
/// <param name="Id">The data element's ID.</param>
/// <param name="DataType">The data element's data type.</param>
/// <param name="Data">The form data.</param>
public record PreviewFormDataElement(string Id, string DataType, JsonNode? Data);
