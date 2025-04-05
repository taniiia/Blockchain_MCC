package models

import (
	"fmt"
	"time"
)

// Patient represents a patient.
type Patient struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Age            int    `json:"age"`
	MedicalHistory string `json:"medicalHistory"`
	Fees           float64 `json:"fees"` // Incremented by doctor/pharmacist
}

// MedicalRecord represents a patient's medical record.
type MedicalRecord struct {
	ID          string    `json:"id"`
	PatientID   string    `json:"patientId"`
	DoctorID    string    `json:"doctorId"`
	Diagnosis   string    `json:"diagnosis"`
	Treatment   string    `json:"treatment"`
	Notes       string    `json:"notes"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	IsEncrypted bool      `json:"isEncrypted"`
}

// Prescription represents a medical prescription.
type Prescription struct {
	ID          string    `json:"id"`
	PatientID   string    `json:"patientId"`
	DoctorID    string    `json:"doctorId"`
	Medication  []string  `json:"medications"`
	Status      string    `json:"status"` // e.g., "pending", "dispensed"
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	IsEncrypted bool      `json:"isEncrypted"`
}

// BillingRecord represents a billing record.
type BillingRecord struct {
	ID             string    `json:"id"`
	PatientID      string    `json:"patientId"`
	Amount         float64   `json:"amount"`
	Status         string    `json:"status"` // "pending", "paid", "rejected"
	InsuranceID    string    `json:"insuranceId,omitempty"`
	InsuranceNotes string    `json:"insuranceNotes,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
	IsEncrypted    bool      `json:"isEncrypted"`
}

// Message represents a communication message.
type Message struct {
	ID        string    `json:"id"`
	FromID    string    `json:"fromId"`
	ToID      string    `json:"toId"`
	Content   string    `json:"content"`
	Channel   string    `json:"channel"` // "communication-channel"
	CreatedAt time.Time `json:"createdAt"`
}

// GenerateID generates a unique ID using a prefix and the current timestamp.
func GenerateID(prefix string) string {
	return fmt.Sprintf("%s:%s", prefix, time.Now().Format("20060102150405"))
}
