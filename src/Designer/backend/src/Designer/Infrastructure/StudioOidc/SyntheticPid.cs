using System.Linq;

namespace Altinn.Studio.Designer.Infrastructure.StudioOidc;

internal static class SyntheticPid
{
    public static bool IsValid(string? pid)
    {
        if (pid is null || pid.Length != 11 || pid.Any(c => c is < '0' or > '9'))
        {
            return false;
        }

        int[] digits = pid.Select(c => c - '0').ToArray();
        int month = digits[2] * 10 + digits[3];
        int day = digits[0] * 10 + digits[1];
        if (day > 40)
        {
            day -= 40;
        }

        return month is >= 81 and <= 92
            && day is >= 1 and <= 31
            && CheckDigit(digits, [3, 7, 6, 1, 8, 9, 4, 5, 2], 9)
            && CheckDigit(digits, [5, 4, 3, 2, 7, 6, 5, 4, 3, 2], 10);
    }

    private static bool CheckDigit(int[] digits, int[] weights, int index)
    {
        int sum = weights.Select((weight, i) => weight * digits[i]).Sum();
        int check = (11 - sum % 11) % 11;
        return check != 10 && check == digits[index];
    }
}
