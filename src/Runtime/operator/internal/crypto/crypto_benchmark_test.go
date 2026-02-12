package crypto

import (
	"crypto/x509"
	"testing"
	"time"

	opclock "altinn.studio/operator/internal/clock"
	"altinn.studio/operator/test/utils"
)

func benchmarkCreateJwks(b *testing.B, algo x509.SignatureAlgorithm, keySize int) {
	clock := opclock.NewFakeClockAt(time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC))
	random := utils.NewDeterministicRand()
	service := NewService(clock, random, algo, keySize)
	subject := CertSubject{CommonName: "benchmark"}
	notAfter := clock.Now().UTC().Add(30 * 24 * time.Hour)

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if _, err := service.CreateJwks(subject, notAfter); err != nil {
			b.Fatalf("CreateJwks: %v", err)
		}
	}
}

func BenchmarkCreateJwks_SHA256RSA2048(b *testing.B) {
	benchmarkCreateJwks(b, x509.SHA256WithRSA, 2048)
}

func BenchmarkCreateJwks_SHA512RSA4096(b *testing.B) {
	benchmarkCreateJwks(b, x509.SHA512WithRSA, 4096)
}
