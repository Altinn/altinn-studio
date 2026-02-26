namespace Altinn.Studio.Designer.Models.Dto;

public sealed record CodeListWrapper(string Title, CodeList? CodeList = null, bool? HasError = null);
