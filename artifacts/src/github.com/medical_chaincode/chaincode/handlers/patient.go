package handlers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/taniiia/medical_chaincode/chaincode/models"
	"github.com/taniiia/medical_chaincode/chaincode/auth"
)

// PatientHandler manages patient-specific operations.
type PatientHandler struct {
	ctx contractapi.TransactionContextInterface
}

// NewPatientHandler creates a new instance.
func NewPatientHandler(ctx contractapi.TransactionContextInterface) *PatientHandler {
	return &PatientHandler{ctx: ctx}
}

// CreateMedicalRecord creates a new (private) medical record.
// Only a doctor can call this method.
func (h *PatientHandler) CreateMedicalRecord(callerID, patientID, diagnosis, treatment string) error {
	// Verify caller is a doctor.
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "doctor" {
		return fmt.Errorf("only a doctor can create medical records")
	}

	record := models.MedicalRecord{
		ID:          models.GenerateID("medical"),
		PatientID:   patientID,
		DoctorID:    callerID,
		Diagnosis:   diagnosis,
		Treatment:   treatment,
		Notes:       "", // To be updated later.
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		IsEncrypted: true,
	}
	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal medical record: %v", err)
	}
	// Always store in the "PrivateMedicalRecords" collection.
	return h.ctx.GetStub().PutPrivateData("PrivateMedicalRecords", record.ID, recordJSON)
}

// GetMedicalRecord retrieves a private medical record.
func (h *PatientHandler) GetMedicalRecord(callerID, recordID string) (*models.MedicalRecord, error) {
	// Optionally, check caller's permission to access the record.
	recordJSON, err := h.ctx.GetStub().GetPrivateData("PrivateMedicalRecords", recordID)
	if err != nil {
		return nil, fmt.Errorf("failed to get record: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("record not found")
	}
	var record models.MedicalRecord
	if err := json.Unmarshal(recordJSON, &record); err != nil {
		return nil, fmt.Errorf("failed to unmarshal record: %v", err)
	}
	return &record, nil
}

// CreatePrescription creates a new prescription.
// Only a doctor may call this method.
func (h *PatientHandler) CreatePrescription(callerID, patientID string, medications []string, notes string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "doctor" {
		return fmt.Errorf("only a doctor can create prescriptions")
	}

	prescription := models.Prescription{
		ID:          models.GenerateID("prescription"),
		PatientID:   patientID,
		DoctorID:    callerID,
		Medication:  medications,
		Status:      "Pending",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		IsEncrypted: true,
	}
	prescJSON, err := json.Marshal(prescription)
	if err != nil {
		return fmt.Errorf("failed to marshal prescription: %v", err)
	}
	return h.ctx.GetStub().PutState(prescription.ID, prescJSON)
}

// CheckIn records a patient check-in.
// Only a receptionist should call this.
func (h *PatientHandler) CheckIn(callerID, patientID string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "receptionist" {
		return fmt.Errorf("only a receptionist can check in a patient")
	}

	key := "checkin:" + patientID
	checkin := map[string]string{
		"patientId": patientID,
		"status":    "CheckedIn",
	}
	checkinJSON, err := json.Marshal(checkin)
	if err != nil {
		return fmt.Errorf("failed to marshal checkin data: %v", err)
	}
	return h.ctx.GetStub().PutState(key, checkinJSON)
}

// CheckOut records a patient check-out.
// Only a receptionist should call this.
func (h *PatientHandler) CheckOut(callerID, patientID string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	if user.Role != "receptionist" {
		return fmt.Errorf("only a receptionist can check out a patient")
	}

	key := "checkout:" + patientID
	checkout := map[string]string{
		"patientId": patientID,
		"status":    "CheckedOut",
	}
	checkoutJSON, err := json.Marshal(checkout)
	if err != nil {
		return fmt.Errorf("failed to marshal checkout data: %v", err)
	}
	return h.ctx.GetStub().PutState(key, checkoutJSON)
}
