package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/taniiia/medical_chaincode/chaincode/auth"
)

// InsuranceHandler handles insurance agent-specific operations.
type InsuranceHandler struct {
	ctx contractapi.TransactionContextInterface
}

// NewInsuranceHandler creates a new instance.
func NewInsuranceHandler(ctx contractapi.TransactionContextInterface) *InsuranceHandler {
	return &InsuranceHandler{ctx: ctx}
}

// ReviewBillingRecord allows an insurance agent to review and update a billing record.
func (h *InsuranceHandler) ReviewBillingRecord(callerID, billingID string, update map[string]interface{}) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "insurance-agent" {
		return fmt.Errorf("only an insurance agent can review billing records")
	}

	billingJSON, err := h.ctx.GetStub().GetState(billingID)
	if err != nil || billingJSON == nil {
		return fmt.Errorf("billing record not found")
	}
	var record map[string]interface{}
	if err := json.Unmarshal(billingJSON, &record); err != nil {
		return fmt.Errorf("failed to unmarshal billing record: %v", err)
	}
	// Merge the update into the record.
	for k, v := range update {
		record[k] = v
	}
	updatedJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal updated billing record: %v", err)
	}
	return h.ctx.GetStub().PutState(billingID, updatedJSON)
}

// GetPendingBillingRecords retrieves all billing records with status "pending".
// Only an insurance agent can call this.
func (h *InsuranceHandler) GetPendingBillingRecords(callerID string) ([]map[string]interface{}, error) {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return nil, err
	}
	if user.Role != "insurance-agent" {
		return nil, fmt.Errorf("only an insurance agent can get pending billing records")
	}

	query := `{"selector":{"status":"pending"}}`
	resultsIterator, err := h.ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending billing records: %v", err)
	}
	defer resultsIterator.Close()

	var records []map[string]interface{}
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate pending billing records: %v", err)
		}
		var record map[string]interface{}
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			return nil, fmt.Errorf("failed to unmarshal billing record: %v", err)
		}
		records = append(records, record)
	}
	return records, nil
}
