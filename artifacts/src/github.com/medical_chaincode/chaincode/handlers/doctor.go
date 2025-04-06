package handlers

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/taniiia/medical_chaincode/chaincode/models"
	"github.com/taniiia/medical_chaincode/chaincode/auth"
)

// DoctorHandler handles doctor-specific operations.
type DoctorHandler struct {
	ctx contractapi.TransactionContextInterface
}

// NewDoctorHandler creates a new instance.
func NewDoctorHandler(ctx contractapi.TransactionContextInterface) *DoctorHandler {
	return &DoctorHandler{ctx: ctx}
}

// UpdateMedicalRecord updates a medical record.
// Only a doctor may update the record.
func (h *DoctorHandler) UpdateMedicalRecord(callerID, recordID, diagnosis, treatment, notes string) error {
	// Check caller role.
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "doctor" {
		return fmt.Errorf("only a doctor can update medical records")
	}

	recordJSON, err := h.ctx.GetStub().GetPrivateData("PrivateMedicalRecords", recordID)
	if err != nil {
		return fmt.Errorf("failed to get record: %v", err)
	}
	if recordJSON == nil {
		return fmt.Errorf("record not found")
	}
	var record models.MedicalRecord
	if err := json.Unmarshal(recordJSON, &record); err != nil {
		return fmt.Errorf("failed to unmarshal record: %v", err)
	}

	record.Diagnosis = diagnosis
	record.Treatment = treatment
	record.Notes = notes
	// UpdatedAt is expected to be set externally if needed.
	updatedJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal updated record: %v", err)
	}
	return h.ctx.GetStub().PutPrivateData("PrivateMedicalRecords", recordID, updatedJSON)
}

// UpdatePrescription updates a prescription.
// Only a doctor may update a prescription.
func (h *DoctorHandler) UpdatePrescription(callerID, prescriptionID string, medications []string, notes string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "doctor" {
		return fmt.Errorf("only a doctor can update prescriptions")
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

	prescription.Medication = medications
	// UpdatedAt is expected to be set externally if needed.
	updatedJSON, err := json.Marshal(prescription)
	if err != nil {
		return fmt.Errorf("failed to marshal updated prescription: %v", err)
	}
	return h.ctx.GetStub().PutState(prescriptionID, updatedJSON)
}
