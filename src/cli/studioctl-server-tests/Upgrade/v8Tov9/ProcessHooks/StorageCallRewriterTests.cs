using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// The call rules: each Storage call in a ported hook becomes the mutator member that does
/// what v8 did, and what the rules cannot move is reported at its line.
/// </summary>
public sealed class StorageCallRewriterTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Rewrites =>
        new()
        {
            {
                // hdir/hego-ccps App/logic/DataProcessing/ProcessTaskEnd.cs:12-17.
                "UpdateDataValue",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await instanceClient.UpdateDataValue(instance, "Fagsystem", "hego");
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            dataMutator.SetDataValue("Fagsystem", "hego");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dat/asbest-ettersending App/logic/DataProcessing/InstantiationProcessor.cs:111.
                "UpdateDataValues with a literal dictionary",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await instanceClient.UpdateDataValues(
                                instance,
                                new Dictionary<string, string?>() { { "instantiatedVersion", "1.2" }, { "env", "prod" } }
                            );
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            dataMutator.SetDataValue("instantiatedVersion", "1.2");
                            dataMutator.SetDataValue("env", "prod");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dat/bht-soknad App/logic/ProcessTaskEnd.cs:32-42.
                "UpdateDataValues of instance.DataValues after edits, in a helper",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await OppdaterDataValues(instance);
                        }

                        private async Task OppdaterDataValues(Instance instance)
                        {
                            var currentVersion = "1.0";
                            instance.DataValues ??= [];
                            instance.DataValues["validatedVersion"] = currentVersion;
                            instance.DataValues["env"] = "prod";

                            await instanceClient.UpdateDataValues(instance, instance.DataValues);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            await OppdaterDataValues(dataMutator);
                            return {{HandlerResult}}.Success();
                        }

                        private async Task OppdaterDataValues({{IInstanceDataMutator}} dataMutator)
                        {
                            var currentVersion = "1.0";
                            dataMutator.SetDataValue("validatedVersion", currentVersion);
                            dataMutator.SetDataValue("env", "prod");
                        }
                    }
                    """
            },
            {
                // dmf/leting-varsel App/logic/instance/Update.cs:53.
                "UpdateDataValues by party id and guid, with a DataValues literal",
                """
                    public class ProcessTaskEnd(IInstanceClient client) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var id = new InstanceIdentifier(instance);
                            await client.UpdateDataValues(id.InstanceOwnerPartyId, id.InstanceGuid, new DataValues() { Values = new Dictionary<string, string?> { { "status", "sendt" } } });
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var id = new InstanceIdentifier(instance);
                            dataMutator.SetDataValue("status", "sendt");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // hdir/data-fra-kuhr-fastlegesenteret App/logic/DataProcessing/ProcessTaskEnd.cs:115 (W5).
                "UpdateDataValues with a dictionary variable",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var dataValues = new Dictionary<string, string?>();
                            foreach (var element in instance.Data)
                            {
                                dataValues[element.DataType] = element.Id;
                            }

                            await instanceClient.UpdateDataValues(instance, dataValues);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataValues = new Dictionary<string, string?>();
                            foreach (var element in instance.Data)
                            {
                                dataValues[element.DataType] = element.Id;
                            }

                            foreach (var (key, value) in dataValues) { dataMutator.SetDataValue(key, value); }
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // pat/patent App/logic/TaskProcessor/ProcessTaskEnd.cs:144-152.
                "UpdatePresentationTexts with a local used once",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var instanceIdentifier = new InstanceIdentifier(instance);
                            PresentationTexts presentationTexts = new PresentationTexts()
                            {
                                Texts = new Dictionary<string, string?>() { { "CaseNumber", "123" } }
                            };

                            await instanceClient.UpdatePresentationTexts(instanceIdentifier.InstanceOwnerPartyId, instanceIdentifier.InstanceGuid, presentationTexts);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var instanceIdentifier = new InstanceIdentifier(instance);

                            dataMutator.SetPresentationText("CaseNumber", "123");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // digdir/regvil-2025-initiell App/logic/instantiation/InstantiationProcessor.cs:59-70, here in a task hook.
                "UpdateSubstatus",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var id = new InstanceIdentifier(instance);
                            await instanceClient.UpdateSubstatus(id.InstanceOwnerPartyId, id.InstanceGuid, new Substatus { Label = "mottatt", Description = "Mottatt" });
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var id = new InstanceIdentifier(instance);
                            dataMutator.SetSubstatus(new Substatus { Label = "mottatt", Description = "Mottatt" });
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // buf/fosterhjem-ep-skjema-person-b App/Custom/Hooks/SigningTaskEnd.cs:52-53.
                "AddCompleteConfirmation with InstanceIdentifier members (W3)",
                """
                    public class SigningTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var iId = new InstanceIdentifier(instance);
                            await instanceClient.AddCompleteConfirmation(iId.InstanceOwnerPartyId, iId.InstanceGuid);
                        }
                    }
                    """,
                $$"""
                    public class SigningTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var iId = new InstanceIdentifier(instance);
                            dataMutator.AddCompleteConfirmation();
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dibk/et-v4 App/logic/ProcessTaskEnd.cs:42 and mat/mattilsynet-bivirkninger App/logic/TaskProcessors/ProcessTaskEnd.cs:155.
                "GetBinaryData into a stream, and GetDataBytes as an argument",
                """
                    public class ProcessTaskEnd(IDataClient dataClient, ILogger<ProcessTaskEnd> logger) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var element = instance.Data.First(d => d.DataType == "xml");
                            var instanceId = new InstanceIdentifier(instance);
                            await using var stream = await dataClient.GetBinaryData(instanceId.InstanceOwnerPartyId, instanceId.InstanceGuid, Guid.Parse(element.Id));
                            logger.LogInformation("{Length} {Bytes}", stream.Length, Count(await dataClient.GetDataBytes(instanceId.InstanceOwnerPartyId, instanceId.InstanceGuid, Guid.Parse(element.Id))));
                        }

                        private static int Count(byte[] bytes) => bytes.Length;
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(ILogger<ProcessTaskEnd> logger) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.First(d => d.DataType == "xml");
                            var instanceId = new InstanceIdentifier(instance);
                            await using var stream = new {{MemoryStreamType}}((await dataMutator.GetBinaryData(element)).ToArray());
                            logger.LogInformation("{Length} {Bytes}", stream.Length, Count((await dataMutator.GetBinaryData(element)).ToArray()));
                            return {{HandlerResult}}.Success();
                        }

                        private static int Count(byte[] bytes) => bytes.Length;
                    }
                    """
            },
            {
                // brg/aarsregnskap-bank-202404 App/logic/DataProcessing/ProcessTaskEnd.cs:88-91,136.
                "Update after changing the tags: only the tags",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            foreach (var dataElement in instance.Data)
                            {
                                await AddTag(instance, dataElement);
                            }
                        }

                        private async Task AddTag(Instance instance, DataElement dataElement)
                        {
                            if (!dataElement.Tags.Contains("hoved"))
                                dataElement.Tags.Add("hoved");
                            await dataClient.Update(instance, dataElement);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            foreach (var dataElement in instance.Data)
                            {
                                await AddTag(dataMutator, dataElement);
                            }
                            return {{HandlerResult}}.Success();
                        }

                        private async Task AddTag({{IInstanceDataMutator}} dataMutator, DataElement dataElement)
                        {
                            if (!dataElement.Tags.Contains("hoved"))
                                dataElement.Tags.Add("hoved");
                            dataMutator.UpdateDataElementMetadata(dataElement, new() { Tags = dataElement.Tags });
                        }
                    }
                    """
            },
            {
                // dat/bilpleie-soknad App/logic/DataProcessing/ProcessTaskEnd.cs:182-196.
                "Update after an upsert of user-defined metadata",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var element = instance.Data.First();
                            element.UserDefinedMetadata ??= [];
                            element.UserDefinedMetadata.RemoveAll(entry => entry.Key == "kategori");
                            element.UserDefinedMetadata.Add(new KeyValueEntry { Key = "kategori", Value = "vedlegg" });
                            await dataClient.Update(instance, element);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var element = instance.Data.First();
                            element.UserDefinedMetadata ??= [];
                            element.UserDefinedMetadata.RemoveAll(entry => entry.Key == "kategori");
                            element.UserDefinedMetadata.Add(new KeyValueEntry { Key = "kategori", Value = "vedlegg" });
                            dataMutator.UpdateDataElementMetadata(element, new() { UserDefinedMetadata = element.UserDefinedMetadata });
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dibk/nabovarsel-svar-v5 App/logic/ProcessTaskEnd.cs:44 (null lists stage nothing).
                "Update of an element changed elsewhere: all four lists, which may be null",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await Save(instance, instance.Data.First());
                        }

                        private async Task Save(Instance instance, DataElement element) => await dataClient.Update(instance, element);
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            await Save(dataMutator, instance.Data.First());
                            return {{HandlerResult}}.Success();
                        }

                        private async Task Save({{IInstanceDataMutator}} dataMutator, DataElement element)
                        {
                            dataMutator.UpdateDataElementMetadata(element, new() { Tags = element.Tags, Metadata = element.Metadata, UserDefinedMetadata = element.UserDefinedMetadata, Refs = element.Refs });
                        }
                    }
                    """
            },
            {
                // pat/patent App/logic/TaskProcessor/ProcessTaskEnd.cs:132-134.
                "unlock, write, lock: the write alone (C-ML1)",
                """
                    public class AllocatedCaseNumber { public string? CaseNumber { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var modelData = instance.Data.Single(x => x.DataType == "AllocatedCaseNumber");
                            InstanceIdentifier instanceIdentifier = new(instance);
                            var modelDataId = Guid.Parse(modelData.Id);
                            var model = new AllocatedCaseNumber { CaseNumber = "1" };
                            await dataClient.UnlockDataElement(instanceIdentifier, modelDataId);
                            await dataClient.UpdateData(model, instanceIdentifier.InstanceGuid, typeof(AllocatedCaseNumber), instance.Org, instance.AppId, instanceIdentifier.InstanceOwnerPartyId, modelDataId);
                            await dataClient.LockDataElement(instanceIdentifier, modelDataId);
                        }
                    }
                    """,
                $$"""
                    public class AllocatedCaseNumber { public string? CaseNumber { get; set; } }

                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var modelData = instance.Data.Single(x => x.DataType == "AllocatedCaseNumber");
                            InstanceIdentifier instanceIdentifier = new(instance);
                            var modelDataId = Guid.Parse(modelData.Id);
                            var model = new AllocatedCaseNumber { CaseNumber = "1" };
                            await dataMutator.ReplaceFormData(new {{DataElementIdentifier}}(modelDataId), model);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // dibk/ig-v3 App/logic/TaskEnd/ProcessTaskEnd.cs:149-169.
                "InsertBinaryData whose element gets metadata and Update (C-WA3)",
                """
                    public class ProcessTaskEnd(IDataClient data) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var dataElement = instance.Data.First();
                            var stream = new MemoryStream(new byte[] { 1 });
                            var signedPdfDataElement = await data.InsertBinaryData(instance.Id, "pdf", "application/pdf", "pdf.pdf", stream);
                            var metadataReferanseXml = new KeyValueEntry { Key = "ReferanseXml", Value = dataElement.Id };
                            signedPdfDataElement.Metadata = [metadataReferanseXml];
                            signedPdfDataElement.Locked = true;
                            signedPdfDataElement.Refs = [Guid.Parse(dataElement.Id)];
                            await data.Update(instance, signedPdfDataElement);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First();
                            var stream = new MemoryStream(new byte[] { 1 });
                            var signedPdfDataElement = dataMutator.AddBinaryDataElement("pdf", "application/pdf", "pdf.pdf", stream.ToArray());
                            var metadataReferanseXml = new KeyValueEntry { Key = "ReferanseXml", Value = dataElement.Id };
                            dataMutator.UpdateDataElementMetadata(signedPdfDataElement.DataElementIdentifier, new() { Metadata = [metadataReferanseXml], Refs = [Guid.Parse(dataElement.Id)] });
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // skd/mva-melding-innsending (stand-in -test) App/logic/TaskProcessing/Steg/OpprettBetalingsinformasjon.cs:122.
                "InsertBinaryData of another stream: copied into bytes first",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            Stream content = File.OpenRead("betaling.xml");
                            await dataClient.InsertBinaryData(instance.Id, "betaling", "application/xml", "betaling.xml", content, "Task_1");
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Stream content = File.OpenRead("betaling.xml");
                            using var contentBuffer = new {{MemoryStreamType}}();
                            await content.CopyToAsync(contentBuffer);
                            dataMutator.AddBinaryDataElement("betaling", "application/xml", "betaling.xml", contentBuffer.ToArray(), "Task_1");
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // nkr/fastregnskapsrapportering App/logic/Instantiation/InstantiationProcessor.cs:29, with a new model.
                "InsertFormData of a model the method creates",
                """
                    public class Model { public string? A { get; set; } }

                    public class ProcessTaskStart(IDataClient dataClient) : IProcessTaskStart
                    {
                        public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            var model = new Model { A = "a" };
                            await dataClient.InsertFormData(instance, "model", model);
                        }
                    }
                    """,
                $$"""
                    public class Model { public string? A { get; set; } }

                    public class ProcessTaskStart : {{IOnTaskStartingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskStartingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            var model = new Model { A = "a" };
                            dataMutator.AddFormDataElement("model", model);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // hdir/innsending-virksomheter-helfo App/logic/DataProcessing/ProcessTaskEnd.cs:360-378.
                "UpdateBinaryData with the element's own bytes: only the filename (C-WB2)",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var dataElement = instance.Data.First();
                            var instanceIdentifier = new InstanceIdentifier(instance);
                            var fileContent = await dataClient.GetDataBytes(instanceIdentifier.InstanceOwnerPartyId, instanceIdentifier.InstanceGuid, new Guid(dataElement.Id));
                            using var fileStream = new MemoryStream(fileContent);
                            await dataClient.UpdateBinaryData(instanceIdentifier, dataElement.ContentType, "nytt-navn.pdf", new Guid(dataElement.Id), fileStream);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var dataElement = instance.Data.First();
                            var instanceIdentifier = new InstanceIdentifier(instance);
                            dataMutator.UpdateDataElementMetadata(dataElement, new() { Filename = "nytt-navn.pdf" });
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // skd (stand-in) App/logic/TaskProcessing/Steg/OpprettLoggfil.cs:121.
                "UpdateBinaryData with new bytes (C-WB1)",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var logg = instance.Data.First(d => d.DataType == "logg");
                            var bytes = Encoding.UTF8.GetBytes("logg");
                            await dataClient.UpdateBinaryData(new InstanceIdentifier(instance), "text/plain", null, Guid.Parse(logg.Id), new MemoryStream(bytes));
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var logg = instance.Data.First(d => d.DataType == "logg");
                            var bytes = Encoding.UTF8.GetBytes("logg");
                            dataMutator.UpdateBinaryDataElement(logg, "text/plain", bytes);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // brg/lovregulerte-yrker App/logic/ProcessTaskEnd.cs:45 and kv/soknad-utlevering-eiendomsdata App/DynamicsIntegrationService.cs:61.
                "GetInstance re-reads: the mutator's instance",
                """
                    public class ProcessEnd(IInstanceClient instanceClient, ILogger<ProcessEnd> logger) : IProcessEnd
                    {
                        public async Task End(Instance instance, List<InstanceEvent>? events)
                        {
                            instance = await instanceClient.GetInstance(instance);
                            var updatedInstance = instanceClient.GetInstance(instance).Result;
                            logger.LogInformation("{Count}", updatedInstance.Data.Count);
                        }
                    }
                    """,
                $$"""
                    public class ProcessEnd(ILogger<ProcessEnd> logger) : {{IOnProcessEndedHandler}}
                    {
                        public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            var updatedInstance = dataMutator.Instance;
                            logger.LogInformation("{Count}", updatedInstance.Data.Count);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // pat/patent App/logic/TaskProcessor/ProcessTaskEnd.cs:86-87.
                "the request language becomes the mutator's (C-LANG)",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient, Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var language = httpContextAccessor.HttpContext?.Request.Query["language"].FirstOrDefault() ?? "nb";
                            await instanceClient.UpdateDataValue(instance, "language", language);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            var language = dataMutator.Language ?? "nb";
                            dataMutator.SetDataValue("language", language);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // brg/virksomhetsregistrering App/Features/DataBackup/DataBackupService.cs:105.
                "the service owner's authentication, a cancellation token and ConfigureAwait go",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var identifier = new InstanceIdentifier(instance);
                            var element = instance.Data.First();
                            await dataClient.DeleteData(identifier.InstanceOwnerPartyId, identifier.InstanceGuid, Guid.Parse(element.Id), false, StorageAuthenticationMethod.ServiceOwner(), CancellationToken.None).ConfigureAwait(false);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var identifier = new InstanceIdentifier(instance);
                            var element = instance.Data.First();
                            dataMutator.RemoveDataElement(element);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // brg/konkursbo-utlodning App/logic/Instantiation/InstantiationHandler.cs:37.
                "a not-awaited data value write becomes the same statement",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance)
                        {
                            instanceClient.UpdateDataValues(instance, new Dictionary<string, string?> { { "a", "b" } });
                            return Task.CompletedTask;
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            dataMutator.SetDataValue("a", "b");
                            return Task.FromResult<{{HandlerResult}}>({{HandlerResult}}.Success());
                        }
                    }
                    """
            },
            {
                // v8's DeleteBinaryData is DeleteData without a delay.
                "DeleteBinaryData",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var id = new InstanceIdentifier(instance);
                            await dataClient.DeleteBinaryData(instance.Org, instance.AppId, id.InstanceOwnerPartyId, id.InstanceGuid, Guid.Parse(instance.Data[0].Id));
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var id = new InstanceIdentifier(instance);
                            dataMutator.RemoveDataElement(instance.Data[0]);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                "the request language read with ToString becomes the mutator's (C-LANG)",
                """
                    public class ProcessTaskEnd(IInstanceClient instanceClient, Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var language = httpContextAccessor.HttpContext?.Request.Query["language"].ToString();
                            await instanceClient.UpdateDataValue(instance, "language", language);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(Microsoft.AspNetCore.Http.IHttpContextAccessor httpContextAccessor) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            var language = dataMutator.Language;
                            dataMutator.SetDataValue("language", language);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                "Update of an element passed elsewhere first: all four lists",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var el = instance.Data.First(d => d.DataType == "vedlegg");
                            AddTag(el);
                            el.Metadata = new List<KeyValueEntry> { new KeyValueEntry { Key = "k", Value = "v" } };
                            await dataClient.Update(instance, el);
                        }

                        private static void AddTag(DataElement el) => el.Tags.Add("t");
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            var el = instance.Data.First(d => d.DataType == "vedlegg");
                            AddTag(el);
                            el.Metadata = new List<KeyValueEntry> { new KeyValueEntry { Key = "k", Value = "v" } };
                            dataMutator.UpdateDataElementMetadata(el, new() { Tags = el.Tags, Metadata = el.Metadata, UserDefinedMetadata = el.UserDefinedMetadata, Refs = el.Refs });
                            return {{HandlerResult}}.Success();
                        }

                        private static void AddTag(DataElement el) => el.Tags.Add("t");
                    }
                    """
            },
            {
                "Update of an element parameter: also the lists its caller changed before the call",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            foreach (var element in instance.Data)
                            {
                                element.Tags.Add("seen");
                                await Save(instance, element);
                            }
                        }

                        private async Task Save(Instance instance, DataElement element)
                        {
                            element.Metadata = [new KeyValueEntry { Key = "k", Value = "v" }];
                            await dataClient.Update(instance, element);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            foreach (var element in instance.Data)
                            {
                                element.Tags.Add("seen");
                                await Save(dataMutator, element);
                            }
                            return {{HandlerResult}}.Success();
                        }

                        private async Task Save({{IInstanceDataMutator}} dataMutator, DataElement element)
                        {
                            element.Metadata = [new KeyValueEntry { Key = "k", Value = "v" }];
                            dataMutator.UpdateDataElementMetadata(element, new() { Metadata = element.Metadata, Tags = element.Tags });
                        }
                    }
                    """
            },
            {
                "a form write whose result a method that is not async waits for",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            Save(instance, new object(), instance.Data[0]);
                            await Task.CompletedTask;
                        }

                        private void Save(Instance instance, object model, DataElement el)
                        {
                            var saved = dataClient.UpdateFormData(instance, model, el).Result;
                            Console.WriteLine(saved.Id);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                            Instance instance = dataMutator.Instance;
                            Save(dataMutator, new object(), instance.Data[0]);
                            await Task.CompletedTask;
                            return {{HandlerResult}}.Success();
                        }

                        private void Save({{IInstanceDataMutator}} dataMutator, object model, DataElement el)
                        {
                            dataMutator.ReplaceFormData(el, model).GetAwaiter().GetResult();
                            var saved = dataMutator.GetDataElement(el);
                            Console.WriteLine(saved.Id);
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(Rewrites))]
    public void TheCall_BecomesTheMutatorMemberThatDoesWhatV8Did(string label, string before, string after)
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Empty(result.Todos);
        AssertCompilesAgainstV9(AppFolder);
    }

    [Theory]
    [MemberData(nameof(Rewrites))]
    public void RunningAgain_FindsNothing(string label, string before, string after)
    {
        _ = (label, after);
        _app.Write(HookPath, InApp(before));
        Port(AppFolder);
        var ported = _app.Read(HookPath);

        var result = PortAgain(AppFolder);

        Assert.Empty(result.Messages);
        Assert.Equal(ported, _app.Read(HookPath));
    }

    public static TheoryData<string, string, string, string> Todos =>
        new()
        {
            {
                // X-OTHER-INSTANCE.
                "a write to another instance (C-XO)",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var copy = await instanceClient.CreateInstance("org", "app", new Instance());
                            await instanceClient.UpdateDataValue(copy, "k", "v");
                        }
                    }
                    """,
                "var copy = await instanceClient.CreateInstance(\"org\", \"app\", new Instance());",
                "IInstanceClient.CreateInstance writes to another instance (a new instance) from a process hook. The mutator covers only this instance, and the step may run more than once: make the call idempotent or move it out of the transition."
            },
            {
                // brg/lovregulerte-yrker App/logic/ProcessTaskEnd.cs:44-54.
                "GenerateAndStorePdf (C-XPDF)",
                """
                    public class Hook(Altinn.App.Core.Internal.Pdf.IPdfService pdfService) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await pdfService.GenerateAndStorePdf(instance, taskId, CancellationToken.None);
                        }
                    }
                    """,
                "await pdfService.GenerateAndStorePdf(instance, taskId, CancellationToken.None);",
                "IPdfService.GenerateAndStorePdf is removed in v9. Generate the PDF with a PDF service task in process.bpmn, or call IPdfService.GeneratePdf and add the bytes with dataMutator.AddBinaryDataElement; use those bytes instead of reading the PDF back."
            },
            {
                // mat/akvakultur-driftsplan App/logic/FormInstantiation.cs:263-282.
                "the id of an added element (C-WA4)",
                """
                    public class Hook(IDataClient dataClient, ILogger<Hook> logger) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var added = await dataClient.InsertBinaryData(instance.Id, "kart", "image/png", "kart.png", new MemoryStream(new byte[] { 1 }));
                            logger.LogInformation("{Id}", added.Id);
                        }
                    }
                    """,
                "var added = await dataClient.InsertBinaryData(",
                "uses the id of the \"kart\" element added here, at line 22; the mutator gets that id from Storage only when the step is saved. Store the reference after the step (for example in the next task's start hook) or keep this code outside the process transition."
            },
            {
                // nkr/fastbudsjett App/logic/instantiation/InstantiationProcessor.cs:26-37.
                "an added form whose object changes later (C-WA1)",
                """
                    public class Model { public string? A { get; set; } }

                    public class Hook(IDataClient dataClient) : IProcessTaskStart
                    {
                        public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            var model = new Model();
                            await dataClient.InsertFormData(instance, "model", model);
                            model.A = "later";
                        }
                    }
                    """,
                "await dataClient.InsertFormData(instance, \"model\", model);",
                "v8 stored model as it was at this call; the mutator saves it as it is when the step ends, and model changes after this line. Add a copy if later changes must not reach \"model\"."
            },
            {
                // tra/egenerklaering App/helpers/ProcessTaskStart.cs:22-35, without the known scenario.
                "an unlock without a write after it (C-ML2)",
                """
                    public class Hook(IDataClient dataClient) : IProcessTaskStart
                    {
                        public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            foreach (var element in instance.Data.Where(d => d.DataType == "skjema"))
                            {
                                await dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(element.Id));
                            }
                        }
                    }
                    """,
                "await dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(element.Id));",
                "unlocks Guid.Parse(element.Id) so that a later task can change it. Bind the data type to that task with taskIds in applicationmetadata.json instead."
            },
            {
                // hemit/fakturaklage-hmr-hf App/logic/DataProcessing/ProcessTaskEnd.cs:100-104.
                "a re-read of the instance after an add (C-RI2)",
                """
                    public class Hook(IDataClient dataClient, IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await dataClient.InsertBinaryData(instance.Id, "pdf", "application/pdf", "a.pdf", new MemoryStream(new byte[] { 1 }));
                            instance = await instanceClient.GetInstance(instance);
                        }
                    }
                    """,
                "instance = await instanceClient.GetInstance(instance);",
                "IInstanceClient.GetInstance re-reads the instance to find an element added before it; the element exists only after the step is saved. Use what the hook added instead of reading it back."
            },
            {
                // DeleteData with delay true, which no app uses.
                "a delete with a delay",
                """
                    public class Hook(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var id = new InstanceIdentifier(instance);
                            await dataClient.DeleteData(id.InstanceOwnerPartyId, id.InstanceGuid, Guid.Parse(instance.Data[0].Id), true);
                        }
                    }
                    """,
                "await dataClient.DeleteData(id.InstanceOwnerPartyId, id.InstanceGuid, Guid.Parse(instance.Data[0].Id), true);",
                "IDataClient.DeleteData still writes to Storage directly in Hook.End, which v9 refuses while the process is transitioning: it deletes with a delay, which the mutator does not do."
            },
            {
                // C-auth: a method other than the service owner's.
                "another authentication method",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await instanceClient.UpdateDataValue(instance, "k", "v", StorageAuthenticationMethod.CurrentUser());
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValue(instance, \"k\", \"v\", StorageAuthenticationMethod.CurrentUser());",
                "IInstanceClient.UpdateDataValue uses StorageAuthenticationMethod.CurrentUser() to reach Storage; the engine saves as the app; set dataMutator.OverrideAuthenticationMethod(dataType, …) if this data type needs another token."
            },
            {
                // staf/soknad-separasjon-soker App/logic/Clients/DataClientWrapper.cs:80,105.
                "a write that may target a form an entry added before it",
                """
                    public class Model { public string? A { get; set; } }

                    public class DataClientWrapper(IDataClient dataClient)
                    {
                        public async Task CreateDataModel(Instance instance, string dataType, object model) =>
                            await dataClient.InsertFormData(instance, dataType, model);

                        public async Task UpdateDataModel(Instance instance, string dataType, object model)
                        {
                            var element = instance.Data.First(d => d.DataType == dataType);
                            await dataClient.UpdateFormData(instance, model, element);
                        }
                    }

                    public class InstantiationProcessor(DataClientWrapper wrapper) : IInstantiationProcessor
                    {
                        public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                        {
                            var model = new Model();
                            await wrapper.CreateDataModel(instance, "vedlegg", model);
                            model.A = "a";
                            await wrapper.UpdateDataModel(instance, "vedlegg", model);
                        }
                    }
                    """,
                "await dataClient.UpdateFormData(instance, model, element);",
                "DataClientWrapper.UpdateDataModel writes dataType right after InstantiationProcessor.DataCreation added it; in v9 an added element is saved as it is at the end of the step, and ReplaceFormData cannot target it. Give the add path its own code that changes the object it passes to AddFormDataElement."
            },
            {
                "a read with an authentication method the code passes on",
                """
                    public class Hook(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await Read(instance, StorageAuthenticationMethod.ServiceOwner());
                        }

                        private async Task Read(Instance instance, StorageAuthenticationMethod method)
                        {
                            var model = await dataClient.GetFormData(instance, instance.Data[0], method);
                            Console.WriteLine(model);
                        }
                    }
                    """,
                "var model = await dataClient.GetFormData(instance, instance.Data[0], method);",
                "IDataClient.GetFormData uses method to reach Storage; the engine saves as the app; set dataMutator.OverrideAuthenticationMethod(dataType, …) if this data type needs another token."
            },
            {
                // dibk/ts-v1 App/logic/TsMapper.cs:234-241.
                "a re-read of the instance after a method the caller called before added an element (C-RI2)",
                """
                    public class Hook(IDataClient dataClient, IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await AddAttachment(instance);
                            await Reload(instance);
                        }

                        private async Task AddAttachment(Instance instance)
                        {
                            await dataClient.InsertBinaryData(instance.Id, "vedlegg", "application/pdf", "a.pdf", new MemoryStream(new byte[] { 1 }));
                        }

                        private async Task Reload(Instance instance)
                        {
                            var reloaded = await instanceClient.GetInstance(instance);
                            instance.Data = reloaded.Data;
                        }
                    }
                    """,
                "var reloaded = await instanceClient.GetInstance(instance);",
                "IInstanceClient.GetInstance re-reads the instance to find an element added before it; the element exists only after the step is saved. Use what the hook added instead of reading it back."
            },
            {
                "a write back with another token stays, so its read is a copy",
                """
                    public class Model { public string? A { get; set; } }

                    public class Hook(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var element = instance.Data[0];
                            var model = (Model)await dataClient.GetFormData(instance, element);
                            model.A = "a";
                            await dataClient.UpdateFormData(instance, model, element, StorageAuthenticationMethod.CurrentUser());
                        }
                    }
                    """,
                "await dataClient.UpdateFormData(instance, model, element, StorageAuthenticationMethod.CurrentUser());",
                "IDataClient.UpdateFormData uses StorageAuthenticationMethod.CurrentUser() to reach Storage; the engine saves as the app; set dataMutator.OverrideAuthenticationMethod(dataType, …) if this data type needs another token."
            },
        };

    [Theory]
    [MemberData(nameof(Todos))]
    public void WhatTheRewriteCannotMove_IsATodo(string label, string source, string anchor, string text)
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Todo, text), result.Messages);
    }

    public static TheoryData<string, string, string, string> Warnings =>
        new()
        {
            {
                // dsb/statsforvalter-tilsyn-kommuner App/logic/EventHandler/SubmitEventHandler.cs:15-36.
                "a catch that swallows the failure of a moved write (P-TRYCATCH)",
                """
                    public class Hook(IInstanceClient instanceClient, ILogger<Hook> logger) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            try
                            {
                                await instanceClient.UpdateDataValue(instance, "k", "v");
                            }
                            catch (Exception e)
                            {
                                logger.LogError(e, "failed");
                            }
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValue(instance, \"k\", \"v\");",
                "the catch around IInstanceClient.UpdateDataValue no longer catches Storage failures: the mutator saves after the hook returns, and a failed save fails the step."
            },
            {
                // UpdateReadStatus, which works while processing.
                "read status has no member",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var id = new InstanceIdentifier(instance);
                            await instanceClient.UpdateReadStatus(id.InstanceOwnerPartyId, id.InstanceGuid, "read");
                        }
                    }
                    """,
                "await instanceClient.UpdateReadStatus(id.InstanceOwnerPartyId, id.InstanceGuid, \"read\");",
                "IInstanceClient.UpdateReadStatus has no mutator member; it still works while the process is transitioning."
            },
            {
                // C-WF3 match.
                "a write of the form added in the same method is dropped (C-WF3)",
                """
                    public class Model { public string? A { get; set; } }

                    public class Hook(IDataClient dataClient) : IProcessTaskStart
                    {
                        public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            var model = new Model();
                            var added = await dataClient.InsertFormData(instance, "model", model);
                            await dataClient.UpdateFormData(instance, model, added);
                        }
                    }
                    """,
                "await dataClient.UpdateFormData(instance, model, added);",
                "removed IDataClient.UpdateFormData of the form added at line 24: the mutator saves the added object as it is when the step ends."
            },
            {
                // The read side of "could not tell which instance".
                "a read of an instance the upgrade cannot place",
                """
                    public static class Holder
                    {
                        public static Guid Guid;
                    }

                    public class Hook(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var party = int.Parse(instance.InstanceOwner.PartyId);
                            await dataClient.GetBinaryData(party, Holder.Guid, Guid.Parse(instance.Data[0].Id));
                        }
                    }
                    """,
                "await dataClient.GetBinaryData(party, Holder.Guid, Guid.Parse(instance.Data[0].Id));",
                "IDataClient.GetBinaryData reads Storage directly in Hook.End; if Holder.Guid is this instance, read through dataMutator."
            },
            {
                // dibk/ig-v3 App/logic/TaskEnd/ProcessTaskEnd.cs:166.
                "a Locked = true on an added element goes (C-WA3)",
                """
                    public class Hook(IDataClient data) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var signedPdfDataElement = await data.InsertBinaryData(instance.Id, "pdf", "application/pdf", "pdf.pdf", new MemoryStream(new byte[] { 1 }));
                            signedPdfDataElement.Locked = true;
                            await data.Update(instance, signedPdfDataElement);
                        }
                    }
                    """,
                "signedPdfDataElement.Locked = true;",
                "dropped Locked = true on the new \"pdf\" element: v9 locks a task's data when the task ends, and data element locks are being removed."
            },
            {
                // dat/bht-soknad App/logic/ProcessTaskEnd.cs:41.
                "data values set by editing instance.DataValues (C-ID1)",
                """
                    public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            instance.DataValues ??= [];
                            instance.DataValues["env"] = "prod";
                            await instanceClient.UpdateDataValues(instance, instance.DataValues);
                        }
                    }
                    """,
                "await instanceClient.UpdateDataValues(instance, instance.DataValues);",
                "IInstanceClient.UpdateDataValues now sets each value with dataMutator.SetDataValue."
            },
        };

    [Theory]
    [MemberData(nameof(Warnings))]
    public void WhatTheRewriteCannotMove_IsAWarning(string label, string source, string anchor, string text)
    {
        _ = label;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Warning, text), result.Messages);
    }

    public static TheoryData<string, string, string> CallsLeftAsTheyAre =>
        new()
        {
            {
                // mat/akvakultur-driftsplan App/logic/FormInstantiation.cs:264-277.
                "an add whose element id the code uses",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            var ids = new List<string>();
                            await AddDocument(instance, File.OpenRead("dokument.pdf"), ids);
                        }

                        private async Task AddDocument(Instance instance, Stream stream, List<string> ids)
                        {
                            var element = await dataClient.InsertBinaryData(instance.Id, "vedlegg", "application/pdf", "dokument.pdf", stream);
                            ids.Add(element.Id);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            Instance instance = context.InstanceDataMutator.Instance;
                            var ids = new List<string>();
                            await AddDocument(instance, File.OpenRead("dokument.pdf"), ids);
                            return {{HandlerResult}}.Success();
                        }

                        private async Task AddDocument(Instance instance, Stream stream, List<string> ids)
                        {
                            var element = await dataClient.InsertBinaryData(instance.Id, "vedlegg", "application/pdf", "dokument.pdf", stream);
                            ids.Add(element.Id);
                        }
                    }
                    """
            },
            {
                "new content whose returned element the code uses",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await Replace(instance, File.OpenRead("dokument.pdf"));
                        }

                        private async Task Replace(Instance instance, Stream stream)
                        {
                            var updated = await dataClient.UpdateBinaryData(new InstanceIdentifier(instance), "application/pdf", "dokument.pdf", Guid.Parse(instance.Data[0].Id), stream);
                            Console.WriteLine(updated.Filename);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            Instance instance = context.InstanceDataMutator.Instance;
                            await Replace(instance, File.OpenRead("dokument.pdf"));
                            return {{HandlerResult}}.Success();
                        }

                        private async Task Replace(Instance instance, Stream stream)
                        {
                            var updated = await dataClient.UpdateBinaryData(new InstanceIdentifier(instance), "application/pdf", "dokument.pdf", Guid.Parse(instance.Data[0].Id), stream);
                            Console.WriteLine(updated.Filename);
                        }
                    }
                    """
            },
            {
                "a form write whose returned element the code passes on",
                """
                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await Save(instance, new object());
                        }

                        private async Task Save(Instance instance, object model)
                        {
                            Console.WriteLine((await dataClient.UpdateFormData(instance, model, instance.Data[0])).Id);
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            Instance instance = context.InstanceDataMutator.Instance;
                            await Save(instance, new object());
                            return {{HandlerResult}}.Success();
                        }

                        private async Task Save(Instance instance, object model)
                        {
                            Console.WriteLine((await dataClient.UpdateFormData(instance, model, instance.Data[0])).Id);
                        }
                    }
                    """
            },
        };

    /// <summary>A stream copy would drain the stream the call still sends, and a mutator parameter would go unused.</summary>
    [Theory]
    [MemberData(nameof(CallsLeftAsTheyAre))]
    public void AWriteLeftAsItIs_KeepsItsStream_AndItsHelperGetsNoMutator(string label, string before, string after)
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Single(result.Todos);
    }

    [Fact]
    public void AHandEditOfInstanceDataAfterADelete_Goes()
    {
        // nfk/soknad-barnehageplass-faginst App/logic/TaskProcessors/SkjulteVedleggProcessor.cs:47-53.
        var source = """
            public class SkjulteVedleggProcessor(IDataClient dataClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    var partyId = int.Parse(instance.InstanceOwner.PartyId);
                    var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
                    foreach (DataElement vedlegg in instance.Data.Where(d => d.DataType == "vedlegg").ToList())
                    {
                        await dataClient.DeleteData(partyId, instanceGuid, Guid.Parse(vedlegg.Id), false);
                        instance.Data.Remove(vedlegg);
                    }
                }
            }
            """;
        _app.Write(HookPath, InApp(source));

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class SkjulteVedleggProcessor : {{IOnTaskEndingHandler}}
                {
                    public bool ShouldRunForTask(string taskId) => true;

                    public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        Instance instance = dataMutator.Instance;
                        var partyId = int.Parse(instance.InstanceOwner.PartyId);
                        var instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
                        foreach (DataElement vedlegg in instance.Data.Where(d => d.DataType == "vedlegg").ToList())
                        {
                            dataMutator.RemoveDataElement(vedlegg);
                        }
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Contains(
            At(
                source,
                "instance.Data.Remove(vedlegg);",
                UpgradeMessageStatus.Warning,
                "removed instance.Data.Remove(vedlegg);: dataMutator.RemoveDataElement removes the element."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void ADataValueDataFieldsDerivesFromTheSameField_IsDropped()
    {
        // krt/krt-1027a-1 App/logic/Dataprocessing/ProcessEndHandler.cs:32-35.
        var source = """
            public class Model { public string? WebSakSokeOrd { get; set; } }

            public class ProcessEndHandler(IDataClient dataClient, IInstanceClient instanceClient) : IProcessEnd
            {
                public async Task End(Instance instance, List<InstanceEvent>? events)
                {
                    var dataModel = (Model)await dataClient.GetFormData(instance, instance.Data.First());
                    await instanceClient.UpdateDataValue(instance, "WebSakSokeOrd", dataModel.WebSakSokeOrd);
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(
            MetadataPath,
            """
            {
              "id": "krt/krt-1027a-1",
              "dataTypes": [
                {
                  "id": "model",
                  "appLogic": {
                    "classRef": "App.Logic.Model"
                  }
                }
              ],
              "dataFields": [
                {
                  "id": "WebSakSokeOrd",
                  "path": "WebSakSokeOrd",
                  "dataTypeId": "model"
                }
              ]
            }
            """
        );

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class Model { public string? WebSakSokeOrd { get; set; } }

                public class ProcessEndHandler : {{IOnProcessEndedHandler}}
                {
                    public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        Instance instance = dataMutator.Instance;
                        var dataModel = (Model)await dataMutator.GetFormData(instance.Data.First());
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Contains(
            At(
                source,
                "await instanceClient.UpdateDataValue(instance, \"WebSakSokeOrd\", dataModel.WebSakSokeOrd);",
                UpgradeMessageStatus.Warning,
                "dropped WebSakSokeOrd: dataFields in applicationmetadata.json derives it from WebSakSokeOrd already."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void ADataValueDataFieldsDerivesFromAnotherField_IsATodo()
    {
        // C-ID2 collision.
        var source = """
            public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    await instanceClient.UpdateDataValue(instance, "sum", "42");
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(
            MetadataPath,
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                {
                  "id": "model"
                }
              ],
              "dataFields": [
                {
                  "id": "sum",
                  "path": "Total",
                  "dataTypeId": "model"
                }
              ]
            }
            """
        );

        var result = Port(AppFolder);

        Assert.Contains(
            At(
                source,
                "await instanceClient.UpdateDataValue(instance, \"sum\", \"42\");",
                UpgradeMessageStatus.Todo,
                "IInstanceClient.UpdateDataValue still writes to Storage directly in Hook.End, which v9 refuses while the process is transitioning: it sets data value sum, which dataFields derives from Total; v9 does not allow both. Remove one."
            ),
            result.Messages
        );
    }

    [Fact]
    public void KeysKnownOnlyAtRunTime_WithDataFieldsInTheApp_AreWarnedAbout()
    {
        // hdir/data-fra-kuhr-fastlegesenteret W5 with dataFields.
        var source = """
            public class Hook(IInstanceClient instanceClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    var values = instance.Data.ToDictionary(d => d.DataType, d => (string?)d.Id);
                    await instanceClient.UpdateDataValues(instance, values);
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(
            MetadataPath,
            """
            {
              "id": "ttd/app",
              "dataTypes": [
                {
                  "id": "model"
                }
              ],
              "dataFields": [
                {
                  "id": "sum",
                  "path": "Total",
                  "dataTypeId": "model"
                }
              ]
            }
            """
        );

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class Hook : {{IOnTaskEndingHandler}}
                {
                    public bool ShouldRunForTask(string taskId) => true;

                    public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                    {
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        Instance instance = dataMutator.Instance;
                        var values = instance.Data.ToDictionary(d => d.DataType, d => (string?)d.Id);
                        foreach (var (key, value) in values) { dataMutator.SetDataValue(key, value); }
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Contains(
            At(
                source,
                "await instanceClient.UpdateDataValues(instance, values);",
                UpgradeMessageStatus.Warning,
                "the keys set here are known only at run time; SetDataValue throws for a key that dataFields in applicationmetadata.json derives (sum), which fails the step."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }
}
