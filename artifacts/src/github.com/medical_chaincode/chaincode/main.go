package main

import (
	"encoding/json"
	"fmt"
	"log"

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
			// CreatedAt is expected to be provided by the client (backend)
		},
		{
			ID:           "doctor1",
			Name:         "Dr. Bob",
			Role:         "doctor",
			Organization: "blr.pesuhospital.com",
			PublicKey:    "pubkey-doctor1",
		},
		{
			ID:           "receptionist1",
			Name:         "Diana Reception",
			Role:         "receptionist",
			Organization: "blr.pesuhospital.com",
			PublicKey:    "pubkey-receptionist1",
		},
		{
			ID:           "receptionist2",
			Name:         "Fiona Reception",
			Role:         "receptionist",
			Organization: "kpm.pesuhospital.com",
			PublicKey:    "pubkey-receptionist2",
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

	switch fn {
	case "registerUser":
		return auth.RegisterUser(ctx, args[0], args[1], args[2], args[3], args[4])
	case "deleteUser":
		return auth.DeleteUser(ctx, clientID, args[0])
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
	case "queryMedicalRecordsByPatient":
		handler := handlers.NewPatientHandler(ctx)
		records, err := handler.QueryMedicalRecordsByPatient(clientID, args[0])
		if err != nil {
			return err
		}
		recordsJSON, err := json.Marshal(records)
		if err != nil {
			return err
		}
		return ctx.GetStub().SetEvent("QueryMedicalRecordsByPatient", recordsJSON)
	case "deleteMedicalRecord":
		handler := handlers.NewPatientHandler(ctx)
		return handler.DeleteMedicalRecord(clientID, args[0])
	case "createPrescription":
		handler := handlers.NewPatientHandler(ctx)
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
		var patient models.Patient
		if err := json.Unmarshal([]byte(args[0]), &patient); err != nil {
			return fmt.Errorf("failed to unmarshal patient data: %v", err)
		}
		return handler.RegisterPatient(clientID, patient)
	case "createBillingRecord":
		handler := handlers.NewReceptionistHandler(ctx)
		var record map[string]interface{}
		if err := json.Unmarshal([]byte(args[1]), &record); err != nil {
			return fmt.Errorf("failed to unmarshal billing record: %v", err)
		}
		return handler.CreateBillingRecord(clientID, args[0], record)
	case "updateBillingStatus":
		handler := handlers.NewReceptionistHandler(ctx)
		return handler.UpdateBillingStatus(clientID, args[0], args[1])
	case "getPatientBillingRecords":
		handler := handlers.NewReceptionistHandler(ctx)
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
		return handler.VerifyPrescription(clientID, args[0], args[1])
	case "getPatientPrescriptions":
		handler := handlers.NewPharmacistHandler(ctx)
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
