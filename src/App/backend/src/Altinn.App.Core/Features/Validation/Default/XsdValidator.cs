using System.Xml;
using System.Xml.Schema;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Validates form data against the XSD schema for the data model, if it exists
/// </summary>
internal sealed class XsdValidator : IValidator
{
    private readonly ILogger<XsdValidator> _logger;
    private readonly IAppResources _appResourceService;
    private readonly IAppMetadata _appMetadata;
    private readonly ModelSerializationService _modelSerializationService;

    /// <summary>
    /// Constructor for the XSD validator
    /// </summary>
    public XsdValidator(
        ILogger<XsdValidator> logger,
        IAppResources appResourceService,
        IAppMetadata appMetadata,
        ModelSerializationService modelSerializationService
    )
    {
        _logger = logger;
        _appResourceService = appResourceService;
        _appMetadata = appMetadata;
        _modelSerializationService = modelSerializationService;
    }

    /// <summary>
    /// We implement <see cref="ShouldRunForTask"/> instead
    /// </summary>
    public string TaskId => "*";

    /// <summary>
    /// Only run for tasks that has data elements with ClassRef and is likely to have an XSD schema to validate against.
    /// </summary>
    public bool ShouldRunForTask(string taskId) =>
        _appMetadata
            .GetApplicationMetadata()
            .Result.DataTypes.Exists(dt => dt.TaskId == taskId && dt.AppLogic?.ClassRef is not null);

    /// <inheritdoc />
    public string ValidationSource => "Xsd";

    /// <inheritdoc />
    public bool NoIncrementalValidation => true;

    /// <summary>
    /// This is not used for incremental validation
    /// </summary>
    public Task<bool> HasRelevantChanges(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        DataElementChanges changes
    ) => Task.FromResult(false);

    /// <inheritdoc />
    public async Task<List<ValidationIssue>> Validate(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        string? language
    )
    {
        var validationIssues = new List<ValidationIssue>();
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElementsForTask(taskId))
        {
            if (dataType.AppLogic?.ClassRef is not { } classRef)
            {
                continue;
            }
            var modelId = classRef.Split('.').Last(); // ModelId is the last part of the class ref, which is the part that is used in the XSD schema file name
            var schema = _appResourceService.GetXsdSchema(modelId);
            if (schema is null)
            {
                _logger.LogInformation(
                    "No XSD schema found for data type {DataTypeId}, skipping XSD validation",
                    dataType.Id
                );
                continue;
            }
            var formData = await dataAccessor.GetFormDataWrapper(dataElement);
            var formDataCopy = formData.Copy();
            formDataCopy.RemoveAltinnRowIds();

            var serializedFormData = _modelSerializationService.SerializeToXml(formDataCopy.BackingData<object>());
            var parsedSchema = new XmlSchemaSet { XmlResolver = null };
            var xsdReaderSettings = new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
            };

            using (var xsdReader = XmlReader.Create(new StringReader(schema), xsdReaderSettings))
            {
                parsedSchema.Add(null, xsdReader);
            }
            var settings = new XmlReaderSettings
            {
                ValidationType = ValidationType.Schema,
                Schemas = parsedSchema,
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
                CloseInput = true,
            };
            settings.ValidationEventHandler += (sender, e) =>
            {
                validationIssues.Add(
                    new ValidationIssue()
                    {
                        Code = "Xsd",
                        CustomTextKey = "backend.xsd_validation",
                        DataElementId = dataElement.Id,
                        Severity = ValidationIssueSeverity.Error,
                        CustomTextParameters = new Dictionary<string, string>()
                        {
                            { "schema", dataType.Id },
                            { "message", e.Message },
                        },
                    }
                );
            };

            try
            {
                var xmlStream = new MemoryAsStream(serializedFormData);
                using var reader = XmlReader.Create(xmlStream, settings);
                while (reader.Read()) { }
            }
            catch (XmlException ex)
            {
                validationIssues.Add(
                    new ValidationIssue()
                    {
                        Code = "Xsd",
                        CustomTextKey = "backend.xsd_validation",
                        DataElementId = dataElement.Id,
                        Severity = ValidationIssueSeverity.Error,
                        CustomTextParameters = new Dictionary<string, string>()
                        {
                            { "schema", dataType.Id },
                            { "message", ex.Message },
                        },
                    }
                );
            }
        }

        return validationIssues;
    }
}
