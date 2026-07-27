using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Generate custom OpenAPI documentation for the app that includes all the data types and operations
/// </summary>
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public class CustomOpenApiController : Controller
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAppResources _appResources;
    private readonly IAppModel _appModel;
    private readonly SchemaGenerator _schemaGenerator;
    private readonly SchemaRepository _schemaRepository;
    private readonly IProcessReader _processReader;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly AppSettings _settings;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public CustomOpenApiController(
        IAppResources appResources,
        IAppModel appModel,
        IAppMetadata appMetadata,
        ISerializerDataContractResolver dataContractResolver,
        IProcessReader processReader,
        IServiceProvider serviceProvider,
        IOptions<AppSettings> settings
    )
    {
        _appResources = appResources;
        _appModel = appModel;
        _appMetadata = appMetadata;
        _processReader = processReader;
        _schemaGenerator = new SchemaGenerator(
            new SchemaGeneratorOptions() { SupportNonNullableReferenceTypes = true },
            dataContractResolver
        );
        _schemaRepository = new SchemaRepository();
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _settings = settings.Value;
    }

    internal static readonly OpenApiSpecVersion SpecVersion = OpenApiSpecVersion.OpenApi3_0;

    /// <summary>
    /// Shared text that should be shown in the description of the OpenAPI documentation.
    /// </summary>
    public static string InfoDescriptionWarningText =>
        """
            App API description for both end users and service owners, as well as open metadata information<br><br>All operations* described within this document require authentication and authorization. Read more at <a href="https://docs.altinn.studio/authentication/guides">https://docs.altinn.studio/authentication/guides</a><br><br><strong>All GET operations* and POST operations may return or contain, respectively, personally identifiable information (PII; national identity numbers and names).</strong><br><br>For more information about this product, see <a href="https://docs.altinn.studio/api/apps">https://docs.altinn.studio/api/apps</a><br><br><em>* Except the metadata APIs</em>

            """;

    /// <summary>
    /// Generate the custom OpenAPI documentation for the app
    /// </summary>
    [HttpGet("/{org}/{app}/v1/customOpenapi.json")]
    public async Task<ActionResult> Index()
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var document = new OpenApiDocument()
        {
            Info = new()
            {
                Title =
                    "Altinn 3 App API for "
                    + (
                        appMetadata.Title.TryGetValue("en", out var englishTitle) ? englishTitle
                        : appMetadata.Title.TryGetValue("nb", out var norwegianTitle) ? norwegianTitle
                        : appMetadata.Id
                    ),
                Contact = new()
                {
                    Name = "Digitaliseringsdirektoratet (altinn)",
                    Url = new("https://digdir-samarbeid.slack.com"),
                },
                Version = appMetadata.AltinnNugetVersion,
                Description = GetIntroDoc(appMetadata),
            },
            ExternalDocs = new() { Description = "Altinn 3 Documentation", Url = new("https://docs.altinn.studio") },
            Paths = [], // Add to this later
            Components = new OpenApiComponents()
            {
                Schemas = _schemaRepository.Schemas,
                SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
                {
                    [Snippets.AltinnTokenSecuritySchemeId] = Snippets.AltinnTokenSecurityScheme,
                },
                Responses = new Dictionary<string, IOpenApiResponse>
                {
                    [Snippets.ProblemDetailsResponseId] = Snippets.ProblemDetailsResponseSchema,
                },
                Parameters = Snippets.CommonParameters,
            },
            Servers =
            [
                new OpenApiServer() { Url = $"http://local.altinn.cloud", Description = "Local development server" },
                new OpenApiServer()
                {
                    Url = $"https://{appMetadata.Org}.apps.tt02.altinn.no",
                    Description = "TT02 server",
                },
                new OpenApiServer()
                {
                    Url = $"https://{appMetadata.Org}.apps.altinn.no",
                    Description = "Production server",
                },
            ],
        };

        // OpenApiSecuritySchemeReference needs the host document to resolve its name when serialized
        // as the key of an OpenApiSecurityRequirement; otherwise the requirement renders as "{}".
        document.Security ??= [];
        document.Security.Add(
            new OpenApiSecurityRequirement()
            {
                [new OpenApiSecuritySchemeReference(Snippets.AltinnTokenSecuritySchemeId, document)] = [],
            }
        );

        AddCommonRoutes(document, appMetadata);

        foreach (var dataType in appMetadata.DataTypes)
        {
            AddRoutsForDataType(document, appMetadata, dataType);
        }

        // Fix issues in the schemas
        var walker = new OpenApiWalker(new SchemaPostVisitor());
        walker.Walk(document);

        return Content(await document.SerializeAsJsonAsync(SpecVersion), "application/json");
    }

    private string GetIntroDoc(ApplicationMetadata appMetadata)
    {
        StringBuilder sb = new();
        sb.AppendLine(InfoDescriptionWarningText);

        sb.AppendLine("This is the API for an Altinn 3 app. The API is based on the OpenAPI 3.0 specification.");
        sb.AppendLine("This app has the following data types:");
        sb.AppendLine("| DataTypeId | Type | Allowed number | MimeTypes | TaskId |");
        sb.AppendLine("|------------|------|----------------|-----------|--------|");
        foreach (var dataType in appMetadata.DataTypes)
        {
            sb.Append('|');
            sb.Append(dataType.Id);
            sb.Append('|');
            if (dataType.AppLogic?.ClassRef is null)
            {
                sb.Append("Attachment");
            }
            else
            {
                sb.Append("FormData");
                if (dataType.AppLogic?.AutoCreate == true)
                {
                    sb.Append(" (AutoCreate)");
                }
            }
            sb.Append('|');
            if (dataType.MaxCount == dataType.MinCount)
            {
                if (dataType.MaxCount == 0)
                {
                    sb.Append('-');
                }
                else
                {
                    sb.Append(dataType.MaxCount);
                }
            }
            else if (dataType.MaxCount > 0 && dataType.MinCount > 0)
            {
                sb.Append(CultureInfo.InvariantCulture, $"{dataType.MinCount}-{dataType.MaxCount}");
            }
            else if (dataType.MaxCount > 0)
            {
                sb.Append(CultureInfo.InvariantCulture, $"0-{dataType.MaxCount}");
            }
            else if (dataType.MinCount > 0)
            {
                sb.Append(CultureInfo.InvariantCulture, $"{dataType.MinCount}-∞");
            }
            else
            {
                sb.Append('-');
            }
            sb.Append('|');
            if (dataType.AllowedContentTypes is not null)
            {
                sb.Append(string.Join(", ", dataType.AllowedContentTypes.Distinct()));
            }
            else
            {
                sb.Append('*');
            }
            sb.Append('|');
            sb.Append(dataType.TaskId);
            sb.Append('|');
            sb.AppendLine();
        }

        var processTasks = _processReader.GetProcessTasks();
        sb.Append(
            """

            ## This app has the following process tasks:
            | TaskId | Name | Type | Actions |
            |--------|------|------|---------|

            """
        );
        foreach (var processTask in processTasks)
        {
            sb.Append("| ");
            sb.Append(processTask.Id);
            sb.Append(" | ");
            sb.Append(processTask.Name);
            sb.Append(" | ");
            sb.Append(processTask.ExtensionElements?.TaskExtension?.TaskType ?? processTask.Name);
            sb.Append(" | ");
            if (processTask.ExtensionElements?.TaskExtension?.AltinnActions is { } actions)
            {
                int i = 0;
                foreach (var action in actions)
                {
                    if (i++ == 1)
                    {
                        sb.Append(", ");
                    }
                    sb.Append(action.Value);
                }
            }
            else
            {
                sb.Append("[no actions]");
            }

            sb.AppendLine(" |");
        }

        return sb.ToString();
    }

    private void AddCommonRoutes(OpenApiDocument document, ApplicationMetadata appMetadata)
    {
        var instanceTags = new HashSet<OpenApiTagReference> { new OpenApiTagReference("Instances") };
        document.Tags ??= new HashSet<OpenApiTag>([]);
        document.Components ??= new OpenApiComponents();
        document.Components.Schemas ??= new Dictionary<string, IOpenApiSchema>();
        document.Tags.Add(new OpenApiTag() { Name = "Instances", Description = "Operations on instances" });
        var instanceSchema = _schemaGenerator.GenerateSchema(typeof(Instance), _schemaRepository);
        document.Components.Schemas.Add("InstanceWrite", Snippets.InstanceWriteSchema);
        var instanceWriteSchema = new OpenApiSchemaReference("InstanceWrite");

        var multipartProperties = new Dictionary<string, IOpenApiSchema> { ["instance"] = instanceWriteSchema };
        var multipartEncodings = new Dictionary<string, OpenApiEncoding>
        {
            ["instance"] = new OpenApiEncoding() { ContentType = "application/json" },
        };
        foreach (var dataType in appMetadata.DataTypes)
        {
            multipartProperties.Add(
                dataType.Id,
                new OpenApiSchema() { Type = JsonSchemaType.String, Format = "binary" }
            );
            multipartEncodings.Add(
                dataType.Id,
                new OpenApiEncoding()
                {
                    ContentType = dataType.AllowedContentTypes is [.. var contentTypes]
                        ? string.Join(' ', contentTypes)
                        : "application/octet-stream",
                }
            );
        }
        document.Paths.Add(
            $"/{appMetadata.Id}/instances",
            new OpenApiPathItem()
            {
                Summary = "Operations for instances",
                Description = "CRUD operations for instances",
                Operations = new()
                {
                    [HttpMethod.Post] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Create new instance",
                        Description = "The main api for creating new instances. ",
                        Parameters =
                        [
                            new OpenApiParameter()
                            {
                                // required=false version of Snippet.InstanceOwnerPartyId
                                Name = "instanceOwnerPartyId",
                                Description =
                                    "The party id of the instance owner (use either this or an instance document in the body)",
                                In = ParameterLocation.Query,
                                Required = false,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.Integer },
                            },
                            Snippets.LanguageParameterReference,
                        ],
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = false,
                            Description = """
                            Instance document, formData and attachments

                            Any mime type that is not ``"application/json"`` or ``"multipart/form-data"`` with an instance document
                            will require the ``instanceOwnerPartyId`` parameter. Otherwise you must use the simplified instance document to specify instance owner.
                            Either using ``instanceOwner.partyId`` or ``instanceOwner.personNumber`` or ``instanceOwner.organisationNumber`` (or ``instanceOwner.username`` see [app-lib-dotnet/#652](https://github.com/Altinn/app-lib-dotnet/issues/652)).
                            """,
                            Content = new Dictionary<string, OpenApiMediaType>
                            {
                                ["empty"] = new OpenApiMediaType()
                                {
                                    Schema = new OpenApiSchema() { Type = JsonSchemaType.Null, Example = null },
                                },
                                ["application/json"] = new OpenApiMediaType() { Schema = instanceWriteSchema },
                                ["multipart/form-data"] = new OpenApiMediaType()
                                {
                                    Schema = new OpenApiSchema()
                                    {
                                        Type = JsonSchemaType.Object,
                                        Properties = multipartProperties,
                                    },
                                    Encoding = multipartEncodings,
                                },
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.Created,
                            new OpenApiResponse()
                            {
                                Description = "Instance created",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["application/json"] = new OpenApiMediaType() { Schema = instanceSchema },
                                },
                            }
                        ),
                    },
                },
            }
        );
        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}",
            new OpenApiPathItem()
            {
                Summary = "Operations for instance",
                Description = "CRUD operations for a specific instance",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        OperationId = "GetInstance",
                        Summary = "Get instance",
                        Description = "Get a specific instance",
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.OK,
                            new OpenApiResponse()
                            {
                                Description = "Instance found",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["application/json"] = new OpenApiMediaType() { Schema = instanceSchema },
                                },
                            }
                        ),
                    },
                    [HttpMethod.Delete] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Delete instance",
                        Description = "Delete a specific instance",
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.NoContent,
                            new OpenApiResponse() { Description = "Instance deleted" }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data",
            new OpenApiPathItem()
            {
                Summary = "Operations for data elements",
                Description = "CRUD operations for data elements in an instance",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Patch] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Patch data elements on instance",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content = new Dictionary<string, OpenApiMediaType>
                            {
                                ["application/json"] = new OpenApiMediaType() { Schema = Snippets.PatchSchema },
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses()
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "Data elements patched",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(DataPatchResponseMultiple),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["409"] = new OpenApiResponse()
                                {
                                    Description = "Precondition in patch failed",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(DataPatchError),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["422"] = new OpenApiResponse()
                                {
                                    Description = "JsonPatch operation failed",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(DataPatchError),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                            }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/{{dataGuid}}",
            new OpenApiPathItem()
            {
                Summary = $"Delete data element",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Delete] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Delete data element",
                        Description = "Delete data for a specific data element",
                        Responses = new()
                        {
                            ["204"] = new OpenApiResponse() { Description = "Data deleted" },
                            ["404"] = new OpenApiResponse() { Description = "Data not found" },
                        },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/process/next",
            new OpenApiPathItem()
            {
                Summary = "Move instance to next process step",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Put] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Move instance to next process step",
                        Description = "Move the instance to the next process step",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = false,
                            Description = "Optional body with specification of the action to perform",
                            Content = new Dictionary<string, OpenApiMediaType>
                            {
                                ["application/json"] = new OpenApiMediaType()
                                {
                                    Schema = _schemaGenerator.GenerateSchema(typeof(ProcessNext), _schemaRepository),
                                },
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses()
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "Instance moved to next process step. Returns the new process state",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(AppProcessState),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["409"] = new OpenApiResponse()
                                {
                                    Description = "Instance is not in a valid state to move to next process step",
                                    Content = Snippets.ProblemDetailsResponseSchema.Content,
                                },
                            }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        var commonTags = new HashSet<OpenApiTagReference> { new OpenApiTagReference("Static") };
        document.Tags.Add(new OpenApiTag() { Name = "Static", Description = "Static info about the application" });

        document.Paths.Add(
            $"/{appMetadata.Id}/api/v1/applicationmetadata",
            new OpenApiPathItem()
            {
                Summary = "Get application metadata",
                Description = "Get the metadata for the application",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = commonTags,
                        Summary = "Get application metadata",
                        Description = "Get the metadata for the application",
                        Security = [],
                        Responses = new()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Application metadata found",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["application/json"] = new OpenApiMediaType()
                                    {
                                        Schema = _schemaGenerator.GenerateSchema(
                                            typeof(ApplicationMetadata),
                                            _schemaRepository
                                        ),
                                    },
                                },
                            },
                        },
                    },
                },
            }
        );
        // Auth exchange endpoint
        var authTags = new HashSet<OpenApiTagReference> { new OpenApiTagReference("Authentication") };
        document.Tags.Add(
            new OpenApiTag()
            {
                Name = "Authentication",
                Description = "Operations for exchanging Maskinporten or ID-Porten tokens to Altinn tokens",
            }
        );
        document.Paths.Add(
            "/authentication/api/v1/exchange/{tokenProvider}",
            new OpenApiPathItem()
            {
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = authTags,
                        Summary =
                            "Action for exchanging a JWT generated by a trusted token provider with a new JWT for further use as authentication against rest of Altinn.",
                        Parameters =
                        [
                            new OpenApiParameter()
                            {
                                Name = "tokenProvider",
                                In = ParameterLocation.Path,
                                Required = true,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.String,
                                    Enum = ["maskinporten", "id-porten"],
                                },
                            },
                            new OpenApiParameter()
                            {
                                Name = "Authorization",
                                Description =
                                    "Bearer token from the selected token provider to exchange for an Altinn token",
                                In = ParameterLocation.Header,
                                Example = "Bearer <token>",
                                Required = true,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.String },
                            },
                            // Test parameter is not relevant for external users?
                            // new OpenApiParameter()
                            // {
                            //     Name = "test",
                            //     In = ParameterLocation.Query,
                            //     Schema = new OpenApiSchema()
                            //     {
                            //         Type = "boolean"
                            //     }
                            // }
                        ],
                        Responses = new OpenApiResponses()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Exchanged token",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["text/plain"] = new OpenApiMediaType()
                                    {
                                        Schema = new OpenApiSchema()
                                        {
                                            Type = JsonSchemaType.String,
                                            Example = "eyJraWQiOiJIdFlaMU1UbFZXUGNCV0JQVWV3TmxZd1RCRklicU1Hb081O",
                                        },
                                    },
                                },
                            },
                            ["401"] = new OpenApiResponse() { Description = "Unauthorized" },
                            ["400"] = new OpenApiResponse() { Description = "Bad Request" },
                            ["429"] = new OpenApiResponse() { Description = "Too Many Requests" },
                        },
                    },
                },
                Servers =
                [
                    new OpenApiServer { Description = "Production environment", Url = "https://platform.altinn.no" },
                    new OpenApiServer { Description = "Test environment", Url = "https://platform.tt02.altinn.no" },
                ],
            }
        );
        document.Paths.Add(
            "/Home/GetTestUserToken",
            new OpenApiPathItem()
            {
                Description = "Get a test user token for use in the local development environment",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = authTags,
                        Parameters =
                        [
                            new OpenApiParameter()
                            {
                                Name = "userId",
                                Description = "The user id of the test user",
                                In = ParameterLocation.Query,
                                Required = true,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.Integer, Example = 1337 },
                            },
                            new OpenApiParameter()
                            {
                                Name = "authenticationLevel",
                                Description = "The authentication level of the test user",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.Integer,
                                    Enum = [0, 1, 2, 3, 4, 5],
                                    Default = 3,
                                },
                                Required = true,
                            },
                        ],
                        Responses = new OpenApiResponses()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Test user token",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["text/plain"] = new OpenApiMediaType()
                                    {
                                        Schema = new OpenApiSchema()
                                        {
                                            Type = JsonSchemaType.String,
                                            Example = "eyJraWQiOiJIdFlaMU1UbFZXUGNCV0JQVWV3TmxZd1RCRklicU1Hb081O",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Servers = [new OpenApiServer { Url = "http://local.altinn.cloud" }],
            }
        );

        // Options endpoint
        var optionsTags = new HashSet<OpenApiTagReference> { new OpenApiTagReference("Options") };
        document.Tags.Add(new OpenApiTag { Name = "Options", Description = "Operations for getting app options" });
        var allOptionsSchemaCollection = GetInstanceAppOptionsSchemaCollection();
        allOptionsSchemaCollection.AddRange(GetAppOptionsSchemaCollection(appMetadata));
        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/options/{{optionsId}}",
            new OpenApiPathItem()
            {
                Summary = "Get instance app options",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new()
                    {
                        Tags = optionsTags,
                        OperationId = "GetInstanceAppOptions",
                        Summary = "Get instance app options",
                        Description =
                            "Exposes options related to the app and logged in user. The tags field is only populated when requesting library code lists.",
                        Parameters =
                        [
                            Snippets.InstanceOwnerPartyIdParameterReference,
                            Snippets.InstanceGuidParameterReference,
                            new OpenApiParameter
                            {
                                Name = "optionsId",
                                Description = "OptionsId from a layout component.",
                                In = ParameterLocation.Path,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.String,
                                    Enum = allOptionsSchemaCollection,
                                },
                            },
                            new OpenApiParameter
                            {
                                Name = "queryParams",
                                Description = "Query parameters supplied.",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.Object,
                                    AdditionalProperties = new OpenApiSchema() { Type = JsonSchemaType.String },
                                    Example = new JsonObject() { ["key"] = "value" },
                                },
                            },
                            new OpenApiParameter
                            {
                                Name = "language",
                                Description = "The language selected by the user (ISO 639-1, e.g., 'nb').",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.String, Example = "nb" },
                            },
                        ],
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "AppOptions",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(List<AppOption>),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                            }
                        ),
                    },
                },
            }
        );
        var appOptionsSchemaCollection = GetAppOptionsSchemaCollection(appMetadata);
        document.Paths.Add(
            $"/{appMetadata.Id}/api/options/{{optionsId}}",
            new OpenApiPathItem()
            {
                Summary = "Get app options",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new()
                    {
                        Tags = optionsTags,
                        OperationId = "GetAppOptions",
                        Summary = "Get app options",
                        Description =
                            "Api that exposes app related options. The tags field is only populated when requesting library code lists.",
                        Parameters =
                        [
                            new OpenApiParameter
                            {
                                Name = "optionsId",
                                Description = "OptionsId from a layout component.",
                                In = ParameterLocation.Path,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.String,
                                    Enum = appOptionsSchemaCollection,
                                },
                            },
                            new OpenApiParameter
                            {
                                Name = "queryParams",
                                Description = "Query parameters supplied.",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.Object,
                                    AdditionalProperties = new OpenApiSchema() { Type = JsonSchemaType.String },
                                    Example = new JsonObject() { ["key"] = "value" },
                                },
                            },
                            new OpenApiParameter
                            {
                                Name = "language",
                                Description = "The language selected by the user (ISO 639-1, e.g., 'nb').",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.String, Example = "nb" },
                            },
                        ],
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "AppOptions",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(List<AppOption>),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                            }
                        ),
                    },
                },
            }
        );

        // Validation endpoint
        var validationTags = new HashSet<OpenApiTagReference> { new OpenApiTagReference("Validation") };
        document.Tags.Add(new OpenApiTag { Name = "Validation", Description = "Operations for validating" });
        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/validate",
            new OpenApiPathItem()
            {
                Summary = "Validate an app instance",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = validationTags,
                        OperationId = "ValidateInstance",
                        Summary = "Validate an app instance",
                        Description =
                            "This will validate all individual data elements, both the binary elements and the elements bound to a model, and then finally the state of the instance.",
                        Parameters =
                        [
                            Snippets.InstanceOwnerPartyIdParameterReference,
                            Snippets.InstanceGuidParameterReference,
                            new OpenApiParameter
                            {
                                Name = "ignoredValidators",
                                Description = "Comma separated list of validators to ignore",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = JsonSchemaType.String,
                                    Example = "DataAnnotations, Altinn.App.Models.model.ModelValidation_FormData",
                                },
                            },
                            new OpenApiParameter
                            {
                                Name = "onlyIncrementalValidators",
                                Description =
                                    "When true, only run incremental validators (those that run on PATCH requests)",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.Boolean, Example = false },
                            },
                            new OpenApiParameter
                            {
                                Name = "language",
                                Description = "The currently used language by the user (or null if not available)",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = JsonSchemaType.String, Example = "nb" },
                            },
                        ],
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "Validation result",
                                    Content = new Dictionary<string, OpenApiMediaType>
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(List<ValidationIssueWithSource>),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["409"] = new OpenApiResponse()
                                {
                                    Description = "Validation cannot be performed (e.g., no active task)",
                                    Content = Snippets.ProblemDetailsResponseSchema.Content,
                                },
                            }
                        ),
                    },
                },
            }
        );
    }

    private List<JsonNode> GetInstanceAppOptionsSchemaCollection()
    {
        var optionsIds = _appImplementationFactory.GetAll<IInstanceAppOptionsProvider>().Select(a => a.Id);

        return optionsIds.Select(optionsId => (JsonNode)optionsId).ToList();
    }

    private List<JsonNode> GetAppOptionsSchemaCollection(ApplicationMetadata appMetadata)
    {
        // Get Altinn 3 library code lists references configured in ApplicationMetadata:
        const string libraryRefRegex =
            @"^lib\*\*(?<org>[a-zA-Z0-9]+)\*\*(?<codeListId>[a-zA-Z0-9_-]+)\*\*(?<version>[a-zA-Z0-9._-]+)$";
        var optionsIds = appMetadata
            .DataTypes.Select(d => d.TaskId)
            .Distinct()
            .Select(taskId => _appResources.GetLayoutModelForFolder(taskId))
            .SelectMany(layout => layout?.AllComponents.OfType<OptionsComponent>().Select(oc => oc.OptionsId) ?? [])
            .Where(o => !string.IsNullOrWhiteSpace(o) && Regex.IsMatch(o, libraryRefRegex))
            .Distinct()
            .ToList();

        // Get all ids from IAppOptionsProviders:
        optionsIds.AddRange(_appImplementationFactory.GetAll<IAppOptionsProvider>().Select(a => a.Id));

        // Get Json file names:
        string jsonOptionsFolderPath = Path.Join(_settings.AppBasePath, _settings.OptionsFolder);
        if (Directory.Exists(jsonOptionsFolderPath))
        {
            optionsIds.AddRange(
                Directory
                    .GetFiles(jsonOptionsFolderPath)
                    .Where(x => x.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                    .Select(Path.GetFileNameWithoutExtension)
            );
        }

        return optionsIds.WhereNotNull().Select(optionsId => (JsonNode)optionsId).ToList();
    }

    private void AddRoutsForDataType(OpenApiDocument doc, ApplicationMetadata appMetadata, DataType dataType)
    {
        var tagName = $"{(dataType.AppLogic?.ClassRef is null ? "FileData" : "FormData")} {dataType.Id}";
        var tags = new HashSet<OpenApiTagReference> { new OpenApiTagReference(tagName) };
        doc.Tags ??= new HashSet<OpenApiTag>();
        doc.Tags.Add(
            new OpenApiTag() { Name = tagName, Description = $"Operations on data elements of type {dataType.Id}" }
        );
        var schema = GetSchemaForDataType(dataType);
        if (schema is not null)
        {
            AddOperationsForFormData(doc, tags, schema, dataType, appMetadata);
        }
        else
        {
            AddRoutesForAttachmentDataType(doc, tags, dataType, appMetadata);
        }
    }

    private void AddOperationsForFormData(
        OpenApiDocument doc,
        HashSet<OpenApiTagReference> tags,
        IOpenApiSchema schema,
        DataType dataType,
        ApplicationMetadata appMetadata
    )
    {
        var jsonType = new OpenApiMediaType() { Schema = schema };
        var xmlType = new OpenApiMediaType()
        {
            Schema = new OpenApiSchema()
            {
                Type = JsonSchemaType.String,
                Format = "binary",
                Title = "Xml",
                Description = $"""See xml schema""",
            },
        };
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/{{dataGuid}}/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Get data",
                        Description = $"""
                        Get data for a specific data element

                        see [JSON Schema](/{appMetadata.Id}/api/jsonschema/{dataType.Id})
                        """,
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.OK,
                            new OpenApiResponse()
                            {
                                Description = """
                                # Data found

                                The response body contains the data in the format specified by the Accept header.


                                """,
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["application/json"] = jsonType,
                                    ["application/xml"] = xmlType,
                                },
                            }
                        ),
                    },
                    [HttpMethod.Put] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Replace data element content",
                        Description = "Update data for a specific data element",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content = new Dictionary<string, OpenApiMediaType>
                            {
                                ["application/json"] = jsonType,
                                ["application/xml"] = xmlType,
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.OK,
                            new OpenApiResponse() { Description = "Data replaced" }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Post] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Create data",
                        Description = "Create data for a specific data element",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content = new Dictionary<string, OpenApiMediaType>
                            {
                                ["application/json"] = jsonType,
                                ["application/xml"] = xmlType,
                            },
                        },
                        Responses = new()
                        {
                            ["201"] = new OpenApiResponse()
                            {
                                Description = "Data created",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["text/json"] = new OpenApiMediaType()
                                    {
                                        Schema = _schemaGenerator.GenerateSchema(
                                            typeof(DataPostResponse),
                                            _schemaRepository
                                        ),
                                    },
                                },
                            },
                            ["400"] = new OpenApiResponse()
                            {
                                Description = "Failed to add data element",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["application/json"] = new OpenApiMediaType()
                                    {
                                        Schema = _schemaGenerator.GenerateSchema(
                                            typeof(DataPostErrorResponse),
                                            _schemaRepository
                                        ),
                                    },
                                },
                            },
                        },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );
    }

    private static void AddRoutesForAttachmentDataType(
        OpenApiDocument doc,
        HashSet<OpenApiTagReference> tags,
        DataType dataType,
        ApplicationMetadata appMetadata
    )
    {
        var description =
            dataType.Description?.Count > 0
                ? dataType.Description.GetValueOrDefault("en")
                    ?? dataType.Description.GetValueOrDefault("nb")
                    ?? dataType.Description.FirstOrDefault().Value
                : $"Http operations for data of type {dataType.Id}";
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/{{dataGuid}}/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = description,
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Get] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Get attachment",
                        Description = "Get attachment for a specific data element",
                        Responses = new()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Attachment found",
                                Content = new Dictionary<string, OpenApiMediaType>
                                {
                                    ["application/octet-stream"] = new OpenApiMediaType()
                                    {
                                        Schema = new OpenApiSchema()
                                        {
                                            Type = JsonSchemaType.String,
                                            Format = "binary",
                                        },
                                    },
                                },
                            },
                            ["404"] = new OpenApiResponse() { Description = "Attachment not found" },
                        },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations = new Dictionary<HttpMethod, OpenApiOperation>
                {
                    [HttpMethod.Post] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Create attachment",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content =
                                dataType
                                    .AllowedContentTypes?.Distinct()
                                    .ToDictionary(contentType => contentType, contentType => new OpenApiMediaType())
                                ?? new Dictionary<string, OpenApiMediaType>() { ["application/octet-stream"] = new() },
                        },
                        Responses = new() { ["201"] = new OpenApiResponse() { Description = "Attachment created" } },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                ],
            }
        );
    }

    private IOpenApiSchema? GetSchemaForDataType(DataType dataType)
    {
        var classRef = dataType.AppLogic?.ClassRef;
        if (classRef == null)
        {
            return null;
        }
        var model = _appModel.GetModelType(classRef);
        if (model == null)
        {
            return null;
        }
        var schema = _schemaGenerator.GenerateSchema(model, _schemaRepository);

        // GenerateSchema may return either the concrete schema or a reference into _schemaRepository.Schemas.
        // Resolve to the concrete schema in the repository so Title/Description can be mutated.
        OpenApiSchema? target = schema as OpenApiSchema;
        if (target is null && schema is OpenApiSchemaReference reference)
        {
            var id = reference.Reference?.Id;
            if (id is not null && _schemaRepository.Schemas.TryGetValue(id, out var stored))
            {
                target = stored as OpenApiSchema;
            }
        }
        if (target is not null)
        {
            target.Title = dataType.Id;
            target.Description =
                dataType.Description?.GetValueOrDefault("en")
                ?? dataType.Description?.GetValueOrDefault("nb")
                ?? dataType.Description?.FirstOrDefault().Value;
        }
        return schema;
    }
}

/// <summary>
/// Common parts from the schema generator
/// </summary>
file static class Snippets
{
    /// <summary>
    /// Schema for the POST endpoint for creating a new instance
    /// </summary>
    public static OpenApiSchema InstanceWriteSchema =>
        new()
        {
            Title = "InstanceWrite",
            Properties = new Dictionary<string, IOpenApiSchema>
            {
                ["instanceOwner"] = new OpenApiSchema()
                {
                    Type = JsonSchemaType.Object,
                    Title = "Alternate ways to specify the instance owner",
                    Description = "Only one of these should be specified when creating a new instance",
                    Properties = new Dictionary<string, IOpenApiSchema>
                    {
                        ["partyId"] = new OpenApiSchema()
                        {
                            Type = JsonSchemaType.String | JsonSchemaType.Null,
                            Format = "int32",
                        },
                        ["personNumber"] = new OpenApiSchema()
                        {
                            Type = JsonSchemaType.String | JsonSchemaType.Null,
                            Pattern = @"^\d{11}$",
                        },
                        ["organisationNumber"] = new OpenApiSchema()
                        {
                            Type = JsonSchemaType.String | JsonSchemaType.Null,
                            Pattern = @"^\d{9}$",
                        },
                        ["username"] = new OpenApiSchema()
                        {
                            Type = JsonSchemaType.String | JsonSchemaType.Null,
                            Description =
                                "Initialization based on username is not yet supported (https://github.com/Altinn/app-lib-dotnet/issues/652)",
                        },
                    },
                },
                ["dueBefore"] = new OpenApiSchema() { Type = JsonSchemaType.String, Format = "date-time" },
                ["visibleAfter"] = new OpenApiSchema() { Type = JsonSchemaType.String, Format = "date-time" },
            },
        };

    /// <summary>
    /// Schema for patching multiple data elements at once
    /// </summary>
    public static OpenApiSchema PatchSchema =>
        new()
        {
            Title = "Run patches on multiple Form data elements at once",
            Type = JsonSchemaType.Object,
            Properties = new Dictionary<string, IOpenApiSchema>
            {
                ["patches"] = new OpenApiSchema
                {
                    Type = JsonSchemaType.Array,
                    Items = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Object,
                        Required = new HashSet<string>(["dataElementId", "patch"]),
                        Properties = new Dictionary<string, IOpenApiSchema>
                        {
                            ["dataElementId"] = new OpenApiSchema { Type = JsonSchemaType.String, Format = "guid" },
                            ["patch"] = new OpenApiSchema
                            {
                                Type = JsonSchemaType.Array,
                                Title = "Json patch",
                                Description = "A standard RFC 6902 document describing changes to one data element",
                                Items = new OpenApiSchema
                                {
                                    Type = JsonSchemaType.Object,
                                    Required = new HashSet<string>() { "op", "path" },
                                    Properties = new Dictionary<string, IOpenApiSchema>
                                    {
                                        ["op"] = new OpenApiSchema
                                        {
                                            Title = "Patch operation",
                                            Type = JsonSchemaType.String,
                                            Enum = ["add", "remove", "replace", "move", "copy", "test"],
                                        },
                                        ["from"] = new OpenApiSchema
                                        {
                                            Title = "JsonPointer",
                                            Type = JsonSchemaType.String,
                                        },
                                        ["path"] = new OpenApiSchema
                                        {
                                            Title = "JsonPointer",
                                            Type = JsonSchemaType.String,
                                        },
                                        ["value"] = new OpenApiSchema
                                        {
                                            Title = "the value",
                                            Description = "The value to add or replace",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                ["ignoredValidators"] = new OpenApiSchema
                {
                    Title = "List of validators to not run incrementally",
                    Description =
                        "This is used for saving server resources, when frontend has a duplicated version of the validator. The validators will be executed on process/next anyway",
                    Items = new OpenApiSchema { Type = JsonSchemaType.String },
                    Type = JsonSchemaType.Array,
                },
            },
            Required = new HashSet<string>(["patches"]),
        };

    internal const string InstanceOwnerPartyIdParameterId = "instanceOwnerPartyId";
    internal const string InstanceGuidParameterId = "instanceGuid";
    internal const string DataGuidParameterId = "dataGuid";
    internal const string LanguageParameterId = "language";
    internal const string ProblemDetailsResponseId = "ProblemDetails";
    internal const string AltinnTokenSecuritySchemeId = General.AppTokenName;

    /// <summary>
    /// Reference to the shared instance owner party id parameter
    /// </summary>
    public static OpenApiParameterReference InstanceOwnerPartyIdParameterReference =>
        new(InstanceOwnerPartyIdParameterId);

    /// <summary>
    /// Reference to the shared instance guid parameter
    /// </summary>
    public static OpenApiParameterReference InstanceGuidParameterReference => new(InstanceGuidParameterId);

    /// <summary>
    /// Reference to the shared data guid parameter
    /// </summary>
    public static OpenApiParameterReference DataGuidParameterReference => new(DataGuidParameterId);

    /// <summary>
    /// Reference to the shared language parameter
    /// </summary>
    public static OpenApiParameterReference LanguageParameterReference => new(LanguageParameterId);

    /// <summary>
    /// Common parameters that are used multiple places in the api
    /// </summary>
    public static IDictionary<string, IOpenApiParameter> CommonParameters =>
        new Dictionary<string, IOpenApiParameter>
        {
            [InstanceOwnerPartyIdParameterId] = new OpenApiParameter
            {
                Name = "instanceOwnerPartyId",
                Description =
                    "PartyId for the owner of the instance, this is Altinn's internal id for the organisation, person or self registered user. Might be the current user, or a party the user has rights to represent.",
                In = ParameterLocation.Path,
                Required = true,
                Schema = new OpenApiSchema() { Type = JsonSchemaType.Integer },
            },
            [InstanceGuidParameterId] = new OpenApiParameter
            {
                Name = "instanceGuid",
                Description = "The guid part of instance.Id",
                In = ParameterLocation.Path,
                Required = true,
                Schema = new OpenApiSchema() { Type = JsonSchemaType.String, Format = "guid" },
            },
            [DataGuidParameterId] = new OpenApiParameter
            {
                Name = "dataGuid",
                Description = "Id of this data element that belongs to an instance",
                In = ParameterLocation.Path,
                Required = true,
                Schema = new OpenApiSchema() { Type = JsonSchemaType.String, Format = "guid" },
            },
            [LanguageParameterId] = new OpenApiParameter
            {
                Name = "language",
                In = ParameterLocation.Query,
                AllowEmptyValue = false,
                Example = "nb",
                Description =
                    "Some apps make changes to the data models or validation based on the active language of the user",
                Required = false,
                Schema = new OpenApiSchema() { Type = JsonSchemaType.String, Pattern = @"\w\w" },
            },
        };

    /// <summary>
    /// Schema for problem details
    /// </summary>
    public static OpenApiResponse ProblemDetailsResponseSchema =>
        new OpenApiResponse()
        {
            Description = "Problem details",
            Content = new Dictionary<string, OpenApiMediaType>
            {
                ["application/problem+json"] = new OpenApiMediaType()
                {
                    Schema = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Object,
                        Properties = new Dictionary<string, IOpenApiSchema>
                        {
                            ["type"] = new OpenApiSchema()
                            {
                                Type = JsonSchemaType.String | JsonSchemaType.Null,
                                Example = "https://datatracker.ietf.org/doc/html/rfc6902/",
                            },
                            ["title"] = new OpenApiSchema()
                            {
                                Type = JsonSchemaType.String | JsonSchemaType.Null,
                                Example = "Error in data processing",
                            },
                            ["status"] = new OpenApiSchema()
                            {
                                Type = JsonSchemaType.Integer | JsonSchemaType.Null,
                                Format = "int32",
                                Example = 400,
                            },
                            ["detail"] = new OpenApiSchema()
                            {
                                Type = JsonSchemaType.String | JsonSchemaType.Null,
                                Example = "Actually useful description of the error",
                            },
                            ["instance"] = new OpenApiSchema() { Type = JsonSchemaType.String | JsonSchemaType.Null },
                            ["traceId"] = new OpenApiSchema() { Type = JsonSchemaType.String | JsonSchemaType.Null },
                        },
                        AdditionalProperties = new OpenApiSchema
                        {
                            Title = "Additional properties",
                            Description = "Additional properties can be added to the problem details",
                        },
                    },
                },
            },
        };

    /// <summary>
    /// Security scheme for Altinn token
    /// </summary>
    public static readonly OpenApiSecurityScheme AltinnTokenSecurityScheme = new()
    {
        Scheme = AuthorizationSchemes.Bearer,
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Description = """
            Get a token for [localtest](http://local.altinn.cloud/Home/Tokens)
            or by exchanging a Maskinporten token with the [token exchange endpoint](https://docs.altinn.studio/api/authentication/spec/#/Authentication/get_exchange__tokenProvider_)
            """,
    };

    /// <summary>
    /// Reference to the AltinnToken security scheme
    /// </summary>
    public static OpenApiSecuritySchemeReference AltinnTokenSecuritySchemeReference => new(AltinnTokenSecuritySchemeId);

    /// <summary>
    /// Reference to the ProblemDetails common response
    /// </summary>
    public static OpenApiResponseReference ProblemDetailsResponseReference => new(ProblemDetailsResponseId);

    /// <summary>
    /// Add common error responses to a response collection
    /// </summary>
    public static OpenApiResponses AddCommonErrorResponses(HttpStatusCode statusCode, OpenApiResponse response)
    {
        var responses = new OpenApiResponses()
        {
            [((int)statusCode).ToString(CultureInfo.InvariantCulture)] = response,
        };
        return AddCommonErrorResponses(responses);
    }

    /// <summary>
    /// Add common error responses to a response collection
    /// </summary>
    public static OpenApiResponses AddCommonErrorResponses(OpenApiResponses responses)
    {
        responses.TryAdd("400", ProblemDetailsResponseReference);
        responses.TryAdd("401", ProblemDetailsResponseReference);
        responses.TryAdd("403", ProblemDetailsResponseReference);
        responses.TryAdd("404", ProblemDetailsResponseReference);
        responses.TryAdd("500", ProblemDetailsResponseReference);
        return responses;
    }
}

/// <summary>
/// Visitor that modifies the schema after it has been generated
/// </summary>
file class SchemaPostVisitor : OpenApiVisitorBase
{
    /// <inheritdoc />
    public override void Visit(IOpenApiSchema schema)
    {
        if (schema is not OpenApiSchema concrete)
        {
            base.Visit(schema);
            return;
        }

        // Remove `altinnRowId` from the data element schema (they are not intended for external usage)
        concrete.Properties?.Remove("altinnRowId");

        // openapi has xml extensions, but they can't represent tags with both attributes and values
        // <tag orid="323">value</tag>, so we just zero properties from SwaggerGen
        concrete.Xml = null;

        // Mark the id property as required
        if (concrete.Properties is not null && concrete.Properties.TryGetValue("id", out var property))
        {
            if (property is OpenApiSchema concreteProperty && concreteProperty.Type is { } propertyType)
            {
                concreteProperty.Type = propertyType & ~JsonSchemaType.Null;
            }
            concrete.Required ??= new HashSet<string>();
            concrete.Required.Add("id");
        }

        // Don't allow additional properties on objects, when the type of the addional properties is not specified
        if (concrete.Type == JsonSchemaType.Object && concrete.AdditionalProperties is null)
        {
            concrete.AdditionalPropertiesAllowed = false;
        }

        base.Visit(schema);
    }
}
