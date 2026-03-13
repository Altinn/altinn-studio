package pdfa

import (
	"crypto/sha256"
	_ "embed"
	"encoding/binary"
	"encoding/hex"
	"math"
	"sync"

	"altinn.studio/pdf3/internal/assert"
)

const (
	iccHeaderSize      = 128
	iccACSPSignature   = "acsp"
	iccDisplayClass    = "mntr"
	iccRGBColorSpace   = "RGB "
	iccXYZProfileSpace = "XYZ "
	srgb2014ICCSHA256  = "384b832de3412066743b52a75ee906b6fb9fb8d9e09e936fc2c43223815c6e0a"
)

var (
	iccProfileCheckOnce sync.Once

	// sRGB2014.icc is the checked-in profile from the ICC registry.
	// See sRGB2014.icc.provenance.txt for the source URL and checksum.
	//go:embed sRGB2014.icc
	srgb2014ICCProfile []byte
)

func srgbICCProfile() []byte {
	iccProfileCheckOnce.Do(validateEmbeddedICCProfile)
	return srgb2014ICCProfile
}

func validateEmbeddedICCProfile() {
	assert.That(len(srgb2014ICCProfile) >= iccHeaderSize, "embedded ICC profile is truncated")
	assert.That(len(srgb2014ICCProfile) <= math.MaxUint32, "embedded ICC profile is unexpectedly large")
	assert.That(
		uint64(binary.BigEndian.Uint32(srgb2014ICCProfile[:4])) == uint64(len(srgb2014ICCProfile)),
		"embedded ICC profile length header does not match file size",
	)
	assert.That(
		string(srgb2014ICCProfile[12:16]) == iccDisplayClass,
		"embedded ICC profile has unexpected device class",
	)
	assert.That(
		string(srgb2014ICCProfile[16:20]) == iccRGBColorSpace,
		"embedded ICC profile has unexpected color space",
	)
	assert.That(string(srgb2014ICCProfile[20:24]) == iccXYZProfileSpace, "embedded ICC profile has unexpected PCS")
	assert.That(
		string(srgb2014ICCProfile[36:40]) == iccACSPSignature,
		"embedded ICC profile is missing the ICC signature",
	)

	sum := sha256.Sum256(srgb2014ICCProfile)
	assert.That(hex.EncodeToString(sum[:]) == srgb2014ICCSHA256, "embedded ICC profile checksum drifted")
}
