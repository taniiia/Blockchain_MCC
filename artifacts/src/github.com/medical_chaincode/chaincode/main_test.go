package main

import (
	"testing"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type mockContext struct {
	contractapi.TransactionContextInterface
}

func TestChaincodeStart(t *testing.T) {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		t.Fatalf("Failed to create chaincode: %v", err)
	}
	_ = chaincode
}
