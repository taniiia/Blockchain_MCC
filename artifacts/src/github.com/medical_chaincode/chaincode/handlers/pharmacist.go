package handlers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/taniiia/medical_chaincode/chaincode/models"
	"github.com/taniiia/medical_chaincode/chaincode/auth"
)

// PharmacistHandler handles pharmacist-specific operations.
type PharmacistHandler struct {
	ctx contractapi.TransactionContextInterface
}

// NewPharmacistHandler creates a new instance.
func NewPharmacistHandler(ctx contractapi.TransactionContextInterface) *PharmacistHandler {
	return &PharmacistHandler{ctx: ctx}
}

// VerifyPrescription marks a prescription as dispensed.
// Only a pharmacist can call this method.
func (h *PharmacistHandler) VerifyPrescription(callerID, prescriptionID, patientID string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "pharmacist" {
		return fmt.Errorf("only a pharmacist can verify prescriptions")
	}

	prescJSON, err := h.ctx.GetStub().GetState(prescriptionID)
	if err != nil {
		return fmt.Errorf("failed to get prescription: %v", err)
	}
	if prescJSON == nil {
		return fmt.Errorf("prescription not found")
	}
	var prescription models.Prescription
	if err := json.Unmarshal(prescJSON, &prescription); err != nil {
		return fmt.Errorf("failed to unmarshal prescription: %v", err)
	}
	prescription.Status = "Dispensed"
	prescription.UpdatedAt = time.Now()
	updatedJSON, err := json.Marshal(prescription)
	if err != nil {
		return fmt.Errorf("failed to marshal updated prescription: %v", err)
	}
	return h.ctx.GetStub().PutState(prescriptionID, updatedJSON)
}

// GetPatientPrescriptions retrieves all prescriptions for a patient.
// Only a pharmacist can call this method.
func (h *PharmacistHandler) GetPatientPrescriptions(callerID, patientID string) ([]models.Prescription, error) {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return nil, err
	}
	if user.Role != "pharmacist" {
		return nil, fmt.Errorf("only a pharmacist can get patient prescriptions")
	}

	query := fmt.Sprintf(`{"selector":{"patientId":"%s"}}`, patientID)
	resultsIterator, err := h.ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query prescriptions: %v", err)
	}
	defer resultsIterator.Close()

	var prescriptions []models.Prescription
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate prescriptions: %v", err)
		}
		var prescription models.Prescription
		if err := json.Unmarshal(kv.Value, &prescription); err != nil {
			return nil, fmt.Errorf("failed to unmarshal prescription: %v", err)
		}
		prescriptions = append(prescriptions, prescription)
	}
	return prescriptions, nil
}
