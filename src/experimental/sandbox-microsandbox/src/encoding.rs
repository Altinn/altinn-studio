pub(crate) fn lower_hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";

    let mut encoded = String::with_capacity(bytes.len() * 2);
    for &byte in bytes {
        encoded.push(char::from(DIGITS[usize::from(byte >> 4)]));
        encoded.push(char::from(DIGITS[usize::from(byte & 0x0f)]));
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::lower_hex;

    #[test]
    fn encodes_lowercase_hex() {
        assert_eq!(lower_hex(&[0x00, 0x1f, 0xa5, 0xff]), "001fa5ff");
    }
}
