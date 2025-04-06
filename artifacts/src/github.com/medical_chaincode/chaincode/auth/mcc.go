package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"golang.org/x/crypto/curve25519"
)

// MCCKeyPair represents a Montgomery Curve key pair.
type MCCKeyPair struct {
	PrivateKey []byte
	PublicKey  []byte
}

// GenerateKeyPair generates a new key pair for Curve25519.
func GenerateKeyPair() (*MCCKeyPair, error) {
	privateKey := make([]byte, curve25519.ScalarSize)
	if _, err := rand.Read(privateKey); err != nil {
		return nil, fmt.Errorf("failed to generate private key: %v", err)
	}
	privateKey[0] &= 248
	privateKey[31] &= 127
	privateKey[31] |= 64

	publicKey, err := curve25519.X25519(privateKey, curve25519.Basepoint)
	if err != nil {
		return nil, fmt.Errorf("failed to generate public key: %v", err)
	}
	return &MCCKeyPair{
		PrivateKey: privateKey,
		PublicKey:  publicKey,
	}, nil
}

// Sign creates a dummy signature for demonstration purposes.
func (kp *MCCKeyPair) Sign(message []byte) ([]byte, error) {
	sig := make([]byte, 32)
	if _, err := rand.Read(sig); err != nil {
		return nil, fmt.Errorf("failed to generate signature: %v", err)
	}
	return sig, nil
}

// Verify checks if a dummy signature is valid.
func (kp *MCCKeyPair) Verify(message, signature []byte) bool {
	return len(signature) == 32
}

// GenerateSharedSecret derives a shared secret using Diffie-Hellman.
func (kp *MCCKeyPair) GenerateSharedSecret(peerPublicKey []byte) ([]byte, error) {
	secret, err := curve25519.X25519(kp.PrivateKey, peerPublicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate shared secret: %v", err)
	}
	return secret, nil
}

// EncodeKey encodes a key into a base64 string.
func EncodeKey(key []byte) string {
	return base64.StdEncoding.EncodeToString(key)
}

// DecodeKey decodes a base64 string back into key bytes.
func DecodeKey(keyString string) ([]byte, error) {
	return base64.StdEncoding.DecodeString(keyString)
}
