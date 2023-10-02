namespace Altinn.Studio.DataModeling.Validator.Json
{
    public class JsonSchemaValidationIssue
    {
        public JsonSchemaValidationIssue(string issuePointer, string errorCode)
        {
            IssuePointer = issuePointer;
            ErrorCode = errorCode;
        }
        public string IssuePointer { get; }
        public string ErrorCode { get; }
    }
}
