package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/taniiia/medical_chaincode/chaincode/auth"
	"github.com/taniiia/medical_chaincode/chaincode/handlers"
	"github.com/taniiia/medical_chaincode/chaincode/models"
)

// SmartContract provides functions for managing the hospital network.
type SmartContract struct {
	contractapi.Contract
}

// InitLedger initializes the ledger with default users (including the admin receptionists).
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	log.Println("Initializing ledger with default users...")

	// Default users for different roles and organizations.
	defaultUsers := []auth.User{
		{
			ID:           "patient1",
			Name:         "Alice Patient",
			Role:         "patient",
			Organization: "blr.pesuhospital.com",
			PublicKey:    "pubkey-patient1",
			CreatedAt:    time.Now(),
		},
		{
			ID:           "doctor1",
			Name:         "Dr. Bob",
			Role:         "doctor",
			Organization: "blr.pesuhospital.com",
			PublicKey:    "pubkey-doctor1",
			CreatedAt:    time.Now(),
		},
		{
			ID:           "pharmacist1",
			Name:         "Charlie Pharmacist",
			Role:         "pharmacist",
			Organization: "kpm.pesuhospital.com",
			PublicKey:    "pubkey-pharmacist1",
			CreatedAt:    time.Now(),
		},
		{
			ID:           "receptionist1",
			Name:         "Diana Reception",
			Role:         "receptionist",
			Organization: "blr.pesuhospital.com",
			PublicKey:    "pubkey-receptionist1",
			CreatedAt:    time.Now(),
		},
		{
			ID:           "receptionist2",
			Name:         "Fiona Reception",
			Role:         "receptionist",
			Organization: "kpm.pesuhospital.com",
			PublicKey:    "pubkey-receptionist2",
			CreatedAt:    time.Now(),
		},
		{
			ID:           "insurance1",
			Name:         "Evan Insurance",
			Role:         "insurance-agent",
			Organization: "kpm.pesuhospital.com",
			PublicKey:    "pubkey-insurance1",
			CreatedAt:    time.Now(),
		},
	}

	for _, user := range defaultUsers {
		if err := auth.RegisterUser(ctx, user.ID, user.Name, user.Role, user.Organization, user.PublicKey); err != nil {
			return fmt.Errorf("failed to register user %s: %v", user.ID, err)
		}
	}

	log.Println("Ledger initialized")
	return nil
}

// Invoke routes the function call to the appropriate handler.
func (s *SmartContract) Invoke(ctx contractapi.TransactionContextInterface) error {
	fn, args := ctx.GetStub().GetFunctionAndParameters()

	// Retrieve client identity.
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Here you could implement additional generic role-based checks.
	// For each function we will also do role-checks inside the handler methods.

	switch fn {
	case "registerUser":
		return auth.RegisterUser(ctx, args[0], args[1], args[2], args[3], args[4])
	case "initiateAuthentication":
		// args: user1ID, user2ID, channelID
		_, err := auth.InitiateAuthentication(ctx, args[0], args[1], args[2])
		return err
	case "completeAuthentication":
		// args: sessionID, sharedSecret
		return auth.CompleteAuthentication(ctx, args[0], args[1])
	case "createMedicalRecord":
		// Only doctor should be allowed.
		handler := handlers.NewPatientHandler(ctx)
		return handler.CreateMedicalRecord(clientID, args[0], args[1], args[2])
	case "createPrescription":
		// Only doctor should be allowed.
		handler := handlers.NewPatientHandler(ctx)
		// args[0] is patientID, args[1] is a JSON string representing []string, args[2] is notes.
		var meds []string
		if err := json.Unmarshal([]byte(args[1]), &meds); err != nil {
			return fmt.Errorf("failed to unmarshal medications: %v", err)
		}
		return handler.CreatePrescription(clientID, args[0], meds, args[2])
	case "checkIn":
		handler := handlers.NewPatientHandler(ctx)
		return handler.CheckIn(clientID, args[0])
	case "checkOut":
		handler := handlers.NewPatientHandler(ctx)
		return handler.CheckOut(clientID, args[0])
	case "registerPatient":
		handler := handlers.NewReceptionistHandler(ctx)
		// args: patient JSON string
		var patient models.Patient
		if err := json.Unmarshal([]byte(args[0]), &patient); err != nil {
			return fmt.Errorf("failed to unmarshal patient data: %v", err)
		}
		return handler.RegisterPatient(clientID, patient)
	case "createBillingRecord":
		handler := handlers.NewReceptionistHandler(ctx)
		// args: billingID and a JSON string for the record.
		var record map[string]interface{}
		if err := json.Unmarshal([]byte(args[1]), &record); err != nil {
			return fmt.Errorf("failed to unmarshal billing record: %v", err)
		}
		return handler.CreateBillingRecord(clientID, args[0], record)
	case "updateBillingStatus":
		handler := handlers.NewReceptionistHandler(ctx)
		// args: billingID, status
		return handler.UpdateBillingStatus(clientID, args[0], args[1])
	case "getPatientBillingRecords":
		handler := handlers.NewReceptionistHandler(ctx)
		// args: patientID
		records, err := handler.GetPatientBillingRecords(clientID, args[0])
		if err != nil {
			return err
		}
		recordsJSON, err := json.Marshal(records)
		if err != nil {
			return err
		}
		return ctx.GetStub().SetEvent("GetPatientBillingRecords", recordsJSON)
	case "verifyPrescription":
		handler := handlers.NewPharmacistHandler(ctx)
		// args: prescriptionID, patientID
		return handler.VerifyPrescription(clientID, args[0], args[1])
	case "getPatientPrescriptions":
		handler := handlers.NewPharmacistHandler(ctx)
		// args: patientID
		prescriptions, err := handler.GetPatientPrescriptions(clientID, args[0])
		if err != nil {
			return err
		}
		prescJSON, err := json.Marshal(prescriptions)
		if err != nil {
			return err
		}
		return ctx.GetStub().SetEvent("GetPatientPrescriptions", prescJSON)
	case "reviewBillingRecord":
		handler := handlers.NewInsuranceHandler(ctx)
		// args: billingID and a JSON string for the update.
		var update map[string]interface{}
		if err := json.Unmarshal([]byte(args[1]), &update); err != nil {
			return fmt.Errorf("failed to unmarshal update data: %v", err)
		}
		return handler.ReviewBillingRecord(clientID, args[0], update)
	case "getPendingBillingRecords":
		handler := handlers.NewInsuranceHandler(ctx)
		records, err := handler.GetPendingBillingRecords(clientID)
		if err != nil {
			return err
		}
		recordsJSON, err := json.Marshal(records)
		if err != nil {
			return err
		}
		return ctx.GetStub().SetEvent("GetPendingBillingRecords", recordsJSON)
	case "sendMessage":
		return handlers.SendMessage(ctx, args)
	case "queryMessages":
		return handlers.QueryMessages(ctx, args)
	case "getUser":
		user, err := auth.GetUser(ctx, args[0])
		if err != nil {
			return err
		}
		userJSON, err := json.Marshal(user)
		if err != nil {
			return err
		}
		return ctx.GetStub().SetEvent("GetUser", userJSON)
	default:
		return fmt.Errorf("function %s not found", fn)
	}
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating medical chaincode: %v", err)
	}
	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting medical chaincode: %v", err)
	}
}
