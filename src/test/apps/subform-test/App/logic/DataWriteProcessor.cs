using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models.model;

namespace Altinn.App.logic
{
    public class DataWriteProcessor : IDataWriteProcessor
    {
        private model? _model;

        public async Task ProcessDataWrite(
            IInstanceDataMutator instanceDataMutator,
            string taskId,
            DataElementChanges changes,
            string? language)
        {
            foreach (var binaryChange in changes.BinaryDataChanges)
            {
                // Maintain our own field with backend-maintained attachment ids. This is to ultimately compare
                // with the attachment ids that the frontend sets. An attachment without a file name carries
                // nothing this bookkeeping can mirror, so skip it rather than tracking a nameless entry.
                if (binaryChange.DataType.Id == "attachments" && binaryChange.FileName is { } fileName)
                {
                    if (binaryChange.Type == ChangeType.Created)
                    {
                        if (fileName == "idontcare.png")
                        {
                            instanceDataMutator.AbandonAllChanges([new ValidationIssue
                            {
                                Field = "AttachmentId",
                                Description = "You cannot upload a file named idontcare.png",
                                Severity = ValidationIssueSeverity.Error
                            }]);
                            return;
                        }

                        var formData = await GetModel(instanceDataMutator);
                        formData.AttachmentName ??= new List<string>();
                        formData.AttachmentName.Add(fileName);
                    }
                    else if (binaryChange.Type == ChangeType.Deleted)
                    {
                        var formData = await GetModel(instanceDataMutator);
                        formData.AttachmentName?.Remove(fileName);
                    }
                }
            }

            if (_model != null)
            {
                // Either list is absent until the first attachment is added, which joins to "".
                List<string> attachmentIds = _model.AttachmentId ?? []; // Updated by frontend
                List<string> attachmentNames = _model.AttachmentName ?? []; // Updated by backend
                _model.AttachmentIdJoined = string.Join(", ", attachmentIds);
                _model.AttachmentNameJoined = string.Join(", ", attachmentNames);
            }

            foreach (var formDataChange in changes.FormDataChanges)
            {
                if (formDataChange.DataType.Id == "model")
                {
                    // The "model" data type declares this class as its ClassRef, so anything else
                    // here means the app is misconfigured.
                    var formData =
                        formDataChange.CurrentFormData as model
                        ?? throw new InvalidOperationException(
                            "Expected the 'model' data element to hold a model instance"
                        );
                    formData.AttachmentId ??= new List<string>();
                    var joined = string.Join(", ", formData.AttachmentId);
                    if (joined != formData.AttachmentIdJoined)
                    {
                        // We intentionally mix where we get the data model from, to show that it can be done in
                        // different ways without conflicting with each other. Above we get the model from the
                        // instanceDataMutator, here we get it from the formDataChange, but both reference the
                        // same object.
                        formData.AttachmentIdJoined = joined;
                    }

                    if (formData.Navn != null && formData.Navn.StartsWith("debug"))
                    {
                        // Just because it's possible, we can now implement a very silly command-like interface
                        // in this input field. This is also useful to test that form-data changes can affect
                        // attachments.
                        //
                        // Syntax is:
                        // - "debug" -> shows hidden fields in the frontend
                        // - "debug,delete,<name>" -> deletes an attachment by name, resets the name field
                        // - "debug,<anything else>" -> does nothing, resets the name field to an error

                        if (formData.Navn.StartsWith("debug,delete,"))
                        {
                            var name = formData.Navn.Substring("debug,delete,".Length);
                            // Absent until the first attachment is added; the same list instance is
                            // mutated when it exists, so removals still reach the data model.
                            List<string> attachmentNames = formData.AttachmentName ?? [];
                            foreach (var element in instanceDataMutator.Instance.Data)
                            {
                                if (element.DataType == "attachments" && element.Filename == name)
                                {
                                    instanceDataMutator.RemoveDataElement(element);
                                    attachmentNames.Remove(name);
                                    // We should update the IDs here as well, but not doing it here forces frontend
                                    // to update the IDs. Leaving it out allows us to test that it happens correctly.
                                }
                            }
                            formData.AttachmentNameJoined = string.Join(", ", attachmentNames);
                            formData.Navn = "debug";
                        } else if (formData.Navn != "debug")
                        {
                            formData.Navn = "debug,invalid command";
                        }
                    }
                }
            }
        }

        private async Task<model> GetModel(IInstanceDataMutator instanceDataMutator)
        {
            if (_model == null)
            {
                // "model" is declared with minCount 1 in applicationmetadata.json, so a missing
                // element means the app is misconfigured, not that the user left something out.
                var element =
                    instanceDataMutator.GetDataElementsForType("model").FirstOrDefault()
                    ?? throw new InvalidOperationException(
                        "Expected a 'model' data element on the instance"
                    );
                _model = await instanceDataMutator.GetFormData<model>(element);
            }

            return _model;
        }
    }
}