namespace Altinn.App.Core.Internal.Expressions;

internal static class ExpressionHelper
{
    internal static int[]? GetRowIndices(string? field)
    {
        if (field == null)
            return null;
        Span<int> rowIndicesSpan = stackalloc int[200]; // Assuming max 200 indices for simplicity recursion will never go deeper than 3-4
        int count = 0;
        for (int index = 0; index < field.Length; index++)
        {
            if (field[index] == '[')
            {
                int startIndex = index + 1;
                int endIndex = field.IndexOf(']', startIndex);
                if (endIndex == -1)
                {
                    throw new InvalidOperationException($"Unpaired [ character in field: {field}");
                }
                string indexString = field[startIndex..endIndex];
                if (int.TryParse(indexString, out int rowIndex))
                {
                    if (count >= rowIndicesSpan.Length)
                    {
                        throw new InvalidOperationException(
                            $"Too many row indices in field: {field}. Max supported: {rowIndicesSpan.Length}"
                        );
                    }
                    rowIndicesSpan[count] = rowIndex;
                    count++;
                    index = endIndex; // Move index to the end of the current bracket
                }
                else
                {
                    throw new InvalidOperationException(
                        $"Invalid row index in field: {field} at position {startIndex}"
                    );
                }
            }
        }
        if (count == 0)
        {
            return null; // No indices found
        }
        int[] rowIndices = new int[count];
        rowIndicesSpan[..count].CopyTo(rowIndices);
        return rowIndices;
    }
}
