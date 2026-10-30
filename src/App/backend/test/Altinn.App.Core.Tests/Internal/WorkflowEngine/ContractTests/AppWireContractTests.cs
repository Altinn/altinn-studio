using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.WorkflowEngine.ContractTesting;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.ContractTests;

/// <summary>
/// Guards the app's curated copies of the workflow-engine wire models against drift from the engine.
///
/// The engine owns the contract: its test suite reflects over its real DTO types and commits the
/// canonical description as <c>wire-contract.verified.json</c> (embedded here at build time). This test
/// reflects over the app's curated copies and asserts they remain wire-compatible with that description.
///
/// The two model sets are intentionally <em>not</em> identical — the app copies are internal, omit
/// engine-only response variants, and may use different (but wire-equivalent) JSON converters. The
/// check therefore verifies compatibility, not equality: every field the app models must exist on the
/// engine with the same shape, and every value the engine always sends must be modelled by the app.
///
/// When this test fails, the engine contract changed. Reconcile the app copies in
/// <c>Internal/WorkflowEngine/Models/</c> with the committed engine description and update this test's
/// type list if a type was added or removed.
/// </summary>
public class AppWireContractTests
{
    /// <summary>
    /// The app's copies of the engine wire contract. Mirrors the engine's root type list; nested object
    /// types (WorkflowResult, CommandDetails, CollectionHeadStatus, ...) are discovered automatically.
    /// </summary>
    private static IReadOnlyList<Type> AppContractTypes =>
        [
            typeof(WorkflowEnqueueRequest),
            typeof(WorkflowRequest),
            typeof(StepRequest),
            typeof(CommandDefinition),
            typeof(RetryStrategy),
            typeof(WorkflowEnqueueResponse.Accepted),
            typeof(WorkflowStatusResponse),
            typeof(StepStatusResponse),
            typeof(PaginatedResponse<WorkflowStatusResponse>),
            typeof(WorkflowCollectionDetailResponse),
            typeof(CancelWorkflowResponse),
            typeof(ResumeWorkflowResponse),
            typeof(MailboxCreateRequest),
            typeof(MailboxResponse),
            typeof(MailboxDeliveryRequest),
            typeof(MailboxDeliveryResponse),
            typeof(Actor),
            typeof(AppCommandData),
            typeof(AppWorkflowContext),
            typeof(AppCallbackPayload),
            typeof(AppCallbackResponse),
        ];

    [Fact]
    public void AppContract_IsCompatibleWithEngineContract()
    {
        var engine = WireContract.Deserialize(ReadEngineContract());
        var app = WireContract.Describe(AppContractTypes);

        var problems = WireContract.FindIncompatibilities(app, engine);

        Assert.True(
            problems.Count == 0,
            "Workflow engine wire-contract drift detected between the app's copies and the engine's "
                + "committed contract:\n  - "
                + string.Join("\n  - ", problems)
        );
    }

    /// <summary>
    /// The copies carry nothing the wire does not. The compatibility check above sees only what serializes, so a
    /// member added for the app's own bookkeeping — non-public, or public but never serialized — would pass it
    /// unseen, and the copy would stop being a copy. What the app needs to carry alongside a request belongs on a
    /// type of its own, as <c>PlannedStep</c> does for the options a step is resolved from before its request is
    /// built.
    /// </summary>
    [Fact]
    public void AppContract_CarriesNothingTheWireDoesNot()
    {
        var problems = new List<string>();
        foreach (Type type in AppWireModelTypes())
        {
            const BindingFlags instance = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
            foreach (PropertyInfo property in type.GetProperties(instance))
            {
                if (property.Name == "EqualityContract")
                {
                    continue; // every record has one, and it never serializes
                }

                if (property.GetMethod is not { IsPublic: true })
                {
                    problems.Add($"{type.Name}.{property.Name}: non-public property on a wire model.");
                }
                else if (
                    property.GetCustomAttribute<JsonIgnoreAttribute>() is { Condition: JsonIgnoreCondition.Always }
                )
                {
                    problems.Add($"{type.Name}.{property.Name}: public property that never serializes.");
                }
            }

            foreach (FieldInfo field in type.GetFields(instance))
            {
                if (!field.Name.Contains("k__BackingField", StringComparison.Ordinal))
                {
                    problems.Add($"{type.Name}.{field.Name}: field on a wire model.");
                }
            }
        }

        Assert.True(
            problems.Count == 0,
            "The app's copies of the engine wire models carry members the wire does not have:\n  - "
                + string.Join("\n  - ", problems)
        );
    }

    /// <summary>
    /// Every type in the two namespaces that hold the copies, nested types included, except enums, the JSON
    /// converters that live beside them, and the types those converters serialize.
    /// </summary>
    private static IEnumerable<Type> AppWireModelTypes() =>
        typeof(StepRequest)
            .Assembly.GetTypes()
            .Where(type =>
                type.Namespace == typeof(StepRequest).Namespace || type.Namespace == typeof(AppCommandData).Namespace
            )
            .Where(type => !type.IsEnum && !typeof(System.Text.Json.Serialization.JsonConverter).IsAssignableFrom(type))
            .Where(type => !type.IsAbstract || !type.IsSealed) // not static classes
            // A type a converter serializes has the converter's shape, not its members'; the contract describes it
            // by the converter, and the compatibility check compares that.
            .Where(type => type.GetCustomAttribute<JsonConverterAttribute>() is null);

    private static string ReadEngineContract()
    {
        var assembly = typeof(AppWireContractTests).Assembly;
        var resourceName = assembly
            .GetManifestResourceNames()
            .Single(name => name.EndsWith("wire-contract.verified.json", StringComparison.Ordinal));

        using var stream =
            assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded engine contract '{resourceName}' could not be opened.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
