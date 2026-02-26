const modularAdditiveInverse = (value: number, base: number): number => base - (value % base);

export function checkValidOrgNr(orgNr: string): boolean {
  if (orgNr.length !== 9 || !/^\d{9}$/.test(orgNr)) {
    return false;
  }
  const digits = orgNr.split('').map(Number);
  const k1 = digits.at(-1)!;

  const weights = [3, 2, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += digits[i] * weights[i];
  }

  let calculated_k1 = modularAdditiveInverse(sum, 11);
  calculated_k1 = calculated_k1 % 11;

  return calculated_k1 === k1;
}

export function checkValidSsn(ssn: string): boolean {
  if (ssn.length !== 11 || !/^\d{11}$/.test(ssn)) {
    return false;
  }

  const digits = ssn.split('').map(Number);
  const k1 = digits.at(-2)!;
  const k2 = digits.at(-1)!;

  const weights1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * weights1[i];
  }

  let calculated_k1 = modularAdditiveInverse(sum1, 11);
  calculated_k1 = calculated_k1 % 11;

  const weights2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    if (i === 9) {
      sum2 += calculated_k1 * weights2[i];
    } else {
      sum2 += digits[i] * weights2[i];
    }
  }

  let calculated_k2 = modularAdditiveInverse(sum2, 11);
  calculated_k2 = calculated_k2 % 11;

  return k1 === calculated_k1 && k2 === calculated_k2;
}
