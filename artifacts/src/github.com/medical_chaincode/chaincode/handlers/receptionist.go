package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/taniiia/medical_chaincode/chaincode/models"
	"github.com/taniiia/medical_chaincode/chaincode/auth"
)

// ReceptionistHandler handles receptionist-specific operations.
type ReceptionistHandler struct {
	ctx contractapi.TransactionContextInterface
}

// NewReceptionistHandler creates a new instance.
func NewReceptionistHandler(ctx contractapi.TransactionContextInterface) *ReceptionistHandler {
	return &ReceptionistHandler{ctx: ctx}
}

// RegisterPatient registers a new patient.
// Only a receptionist can call this.
func (h *ReceptionistHandler) RegisterPatient(callerID string, patient models.Patient) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "receptionist" {
		return fmt.Errorf("only a receptionist can register a patient")
	}

	patientJSON, err := json.Marshal(patient)
	if err != nil {
		return fmt.Errorf("failed to marshal patient data: %v", err)
	}
	return h.ctx.GetStub().PutState(patient.ID, patientJSON)
}

// CreateBillingRecord creates a new billing record.
// Only a receptionist can call this.
func (h *ReceptionistHandler) CreateBillingRecord(callerID, billingID string, record map[string]interface{}) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "receptionist" {
		return fmt.Errorf("only a receptionist can create billing records")
	}

	billingJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal billing record: %v", err)
	}
	return h.ctx.GetStub().PutState(billingID, billingJSON)
}

// UpdateBillingStatus updates the status of a billing record.
// Only a receptionist can call this.
func (h *ReceptionistHandler) UpdateBillingStatus(callerID, billingID, status string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "receptionist" {
		return fmt.Errorf("only a receptionist can update billing status")
	}

	billingJSON, err := h.ctx.GetStub().GetState(billingID)
	if err != nil {
		return fmt.Errorf("failed to get billing record: %v", err)
	}
	if billingJSON == nil {
		return fmt.Errorf("billing record not found")
	}
	var record map[string]interface{}
	if err := json.Unmarshal(billingJSON, &record); err != nil {
		return fmt.Errorf("failed to unmarshal billing record: %v", err)
	}
	record["status"] = status
	updatedJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal updated billing record: %v", err)
	}
	return h.ctx.GetStub().PutState(billingID, updatedJSON)
}

// GetPatientBillingRecords retrieves all billing records for a patient.
// Only a receptionist can call this.
func (h *ReceptionistHandler) GetPatientBillingRecords(callerID, patientID string) ([]models.BillingRecord, error) {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return nil, err
	}
	if user.Role != "receptionist" {
		return nil, fmt.Errorf("only a receptionist can get billing records")
	}

	query := fmt.Sprintf(`{"selector":{"patientId":"%s"}}`, patientID)
	resultsIterator, err := h.ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query billing records: %v", err)
	}
	defer resultsIterator.Close()

	var records []models.BillingRecord
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate billing records: %v", err)
		}
		var record models.BillingRecord
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			return nil, fmt.Errorf("failed to unmarshal billing record: %v", err)
		}
		records = append(records, record)
	}
	return records, nil
}
