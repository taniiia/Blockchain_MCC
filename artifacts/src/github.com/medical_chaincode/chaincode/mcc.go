package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"golang.org/x/crypto/curve25519"
)

// GenerateMCCKeyPair generates a Curve25519 key pair.
func GenerateMCCKeyPair() (privateKey, publicKey []byte, err error) {
	privateKey = make([]byte, curve25519.ScalarSize)
	if _, err = rand.Read(privateKey); err != nil {
		return nil, nil, fmt.Errorf("failed to generate private key: %v", err)
	}
	privateKey[0] &= 248
	privateKey[31] &= 127
	privateKey[31] |= 64

	publicKey, err = curve25519.X25519(privateKey, curve25519.Basepoint)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate public key: %v", err)
	}
	return privateKey, publicKey, nil
}

// EncodeKey to Base64 for convenience.
func EncodeKey(key []byte) string {
	return base64.StdEncoding.EncodeToString(key)
}
