package models

import (
	"fmt"

	"github.com/google/uuid"
)

// Patient represents a patient.
type Patient struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Age            int     `json:"age"`
	MedicalHistory string  `json:"medicalHistory"`
	Fees           float64 `json:"fees"` // Incremented by doctor/pharmacist
	// CreatedAt and UpdatedAt are set externally by the backend.
}

// MedicalRecord represents a patient's medical record.
type MedicalRecord struct {
	ID          string `json:"id"`
	PatientID   string `json:"patientId"`
	DoctorID    string `json:"doctorId"`
	Diagnosis   string `json:"diagnosis"`
	Treatment   string `json:"treatment"`
	Notes       string `json:"notes"`
	// CreatedAt and UpdatedAt are expected to be provided by the client.
	IsEncrypted bool `json:"isEncrypted"`
}

// Prescription represents a medical prescription.
type Prescription struct {
	ID          string   `json:"id"`
	PatientID   string   `json:"patientId"`
	DoctorID    string   `json:"doctorId"`
	Medication  []string `json:"medications"`
	Status      string   `json:"status"` // e.g., "pending", "dispensed"
	// CreatedAt and UpdatedAt are expected to be provided by the client.
	IsEncrypted bool `json:"isEncrypted"`
}

// BillingRecord represents a billing record.
type BillingRecord struct {
	ID             string  `json:"id"`
	PatientID      string  `json:"patientId"`
	Amount         float64 `json:"amount"`
	Status         string  `json:"status"` // "pending", "paid", "rejected"
	InsuranceID    string  `json:"insuranceId,omitempty"`
	InsuranceNotes string  `json:"insuranceNotes,omitempty"`
	// CreatedAt and UpdatedAt are expected to be provided by the client.
	IsEncrypted bool `json:"isEncrypted"`
}

// Message represents a communication message.
type Message struct {
	ID        string `json:"id"`
	FromID    string `json:"fromId"`
	ToID      string `json:"toId"`
	Content   string `json:"content"`
	Channel   string `json:"channel"` // "communication-channel"
	// CreatedAt is expected to be provided by the client.
}

// GenerateID generates a unique ID using a UUID.
func GenerateID(prefix string) string {
	return fmt.Sprintf("%s:%s", prefix, uuid.New().String())
}
