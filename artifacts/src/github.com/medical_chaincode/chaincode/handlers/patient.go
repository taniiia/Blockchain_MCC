package handlers

import (
	"encoding/json"
	"fmt"

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
		Notes:       "",
		// CreatedAt and UpdatedAt are expected to be set externally if needed.
		IsEncrypted: true,
	}
	recordJSON, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("failed to marshal medical record: %v", err)
	}
	return h.ctx.GetStub().PutPrivateData("PrivateMedicalRecords", record.ID, recordJSON)
}

// GetMedicalRecord retrieves a private medical record.
// Access is controlled via the private data collection "PrivateMedicalRecords"
// and only authorized participants (e.g. on the patient-medical-channel) can retrieve it.
func (h *PatientHandler) GetMedicalRecord(callerID, recordID string) (*models.MedicalRecord, error) {
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
	// Optional: Add further access control by checking if callerID is allowed to view this record.
	return &record, nil
}

// QueryMedicalRecordsByPatient retrieves all medical records for a given patient.
func (h *PatientHandler) QueryMedicalRecordsByPatient(callerID, patientID string) ([]models.MedicalRecord, error) {
	// Optional: Add role/access check if needed.
	query := fmt.Sprintf(`{"selector":{"patientId":"%s"}}`, patientID)
	resultsIterator, err := h.ctx.GetStub().GetPrivateDataQueryResult("PrivateMedicalRecords", query)
	if err != nil {
		return nil, fmt.Errorf("failed to query medical records: %v", err)
	}
	defer resultsIterator.Close()

	var records []models.MedicalRecord
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("failed to iterate medical records: %v", err)
		}
		var record models.MedicalRecord
		if err := json.Unmarshal(kv.Value, &record); err != nil {
			return nil, fmt.Errorf("failed to unmarshal record: %v", err)
		}
		records = append(records, record)
	}
	return records, nil
}

// DeleteMedicalRecord deletes a medical record from the private collection.
// Only a doctor (or an authorized role) can delete the record.
func (h *PatientHandler) DeleteMedicalRecord(callerID, recordID string) error {
	user, err := auth.GetUser(h.ctx, callerID)
	if err != nil {
		return err
	}
	// For example, only a doctor can delete a record.
	if user.Role != "doctor" {
		return fmt.Errorf("only a doctor can delete medical records")
	}
	// Optionally, check that the doctor is the creator of the record.
	return h.ctx.GetStub().DelPrivateData("PrivateMedicalRecords", recordID)
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
