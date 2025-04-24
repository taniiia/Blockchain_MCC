package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	//"time"

	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-contract-api-go/metadata"
	sc "github.com/hyperledger/fabric-protos-go/peer"
)

// SmartContract implements chaincode functions.
type SmartContract struct{}

// GetAfterTransaction implements contractapi.ContractInterface.
func (s *SmartContract) GetAfterTransaction() interface{} {
	panic("unimplemented")
}

// GetBeforeTransaction implements contractapi.ContractInterface.
func (s *SmartContract) GetBeforeTransaction() interface{} {
	panic("unimplemented")
}

// GetInfo implements contractapi.ContractInterface.
func (s *SmartContract) GetInfo() metadata.InfoMetadata {
	panic("unimplemented")
}

// GetName implements contractapi.ContractInterface.
func (s *SmartContract) GetName() string {
	panic("unimplemented")
}

// GetTransactionContextHandler implements contractapi.ContractInterface.
func (s *SmartContract) GetTransactionContextHandler() contractapi.SettableTransactionContextInterface {
	panic("unimplemented")
}

// GetUnknownTransaction implements contractapi.ContractInterface.
func (s *SmartContract) GetUnknownTransaction() interface{} {
	panic("unimplemented")
}

// ----- DATA STRUCTURES ----- //

// User represents a registered user.
type User struct {
	UUID         string `json:"uuid"`
	Name         string `json:"name"`
	Organization string `json:"organization"`
	Role         string `json:"role"`
	Gender       string `json:"gender,omitempty"`
	Age          int    `json:"age,omitempty"`
	Speciality   string `json:"speciality,omitempty"` // for doctors
}

// MedicalRecord holds patient-medication info. Stored as private data.
type MedicalRecord struct {
	RecordID  string `json:"recordId"`
	PatientID string `json:"patientId"`
	DoctorID  string `json:"doctorId"`
	Symptoms  string `json:"symptoms"`
	Diagnosis string `json:"diagnosis"`
	Notes     string `json:"notes"`
}

// Prescription holds prescription data (private).
type Prescription struct {
	PrescriptionID string   `json:"prescriptionId"`
	PatientID      string   `json:"patientId"`
	DoctorID       string   `json:"doctorId"`
	Medications    []string `json:"medications"`
	BillAmount     float64  `json:"billAmount"`
	Status         string   `json:"status"` // e.g., "Pending", "Dispensed"
}

// BillingRecord is stored on the billing channel.
type BillingRecord struct {
	RecordID  string  `json:"recordId"`
	PatientID string  `json:"patientId"`
	Amount    float64 `json:"amount"`
	Status    string  `json:"status"` // "Pending", "Paid"
}

// Message is used on the communication channel.
type Message struct {
	ID      string `json:"id"`
	FromID  string `json:"fromId"`
	ToID    string `json:"toId"`
	Content string `json:"content"`
	Channel string `json:"channel"`
}

// ----- CHAINCODE INITIALIZATION & INVOCATION ----- //

// Init is called during chaincode instantiation.
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

// Invoke routes function calls.
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {
	function, args := APIstub.GetFunctionAndParameters()
	fmt.Printf("Invoke function: %s, args: %v\n", function, args)

	switch function {
	// Registration channel
	case "registerUser":
		return s.registerUser(APIstub, args)
	case "initLedger":
		return s.initLedger(APIstub)
	case "registerPatient":
		return s.registerPatient(APIstub, args)
	case "registerDoctor":
		return s.registerDoctor(APIstub, args)
	case "patientCheckIn":
		return s.patientCheckIn(APIstub, args)
	case "checkOut":
		return s.checkOut(APIstub, args)
	// Patient-medication channel
	case "createMedicalRecord":
		return s.createMedicalRecord(APIstub, args)
	case "getMedicalRecord":
		return s.getMedicalRecord(APIstub, args)
	case "updateMedicalRecord":
		return s.updateMedicalRecord(APIstub, args)
	case "createPrescription":
		return s.createPrescription(APIstub, args)
	case "getPrescription":
		return s.getPrescription(APIstub, args)
	case "updatePrescription":
		return s.updatePrescription(APIstub, args)
	case "dispenseMedication":
		return s.dispenseMedication(APIstub, args)
	// Billing channel
	case "billing":
		return s.billing(APIstub, args)
	// Communication channel
	case "sendMessage":
		return s.sendMessage(APIstub, args)
	case "getMessages":
		return s.getMessages(APIstub, args)
	// Query function
	case "queryPatientsByDoctor":
		return s.queryPatientsByDoctor(APIstub, args)
	default:
		return shim.Error("Invalid Smart Contract function name.")
	}
}

// initLedger initializes the ledger with some predefined users.
func (s *SmartContract) initLedger(APIstub shim.ChaincodeStubInterface) sc.Response {
	// Define a slice of User records to initialize.
	users := []User{
		{
			UUID:         "patient:Alice:" + APIstub.GetTxID(),
			Name:         "Alice",
			Organization: "blr.pesuhospital.com",
			Role:         "patient",
			Gender:       "F",
			Age:          28,
		},
		{
			UUID:         "doctor:Bob:" + APIstub.GetTxID(),
			Name:         "Bob",
			Organization: "blr.pesuhospital.com",
			Role:         "doctor",
			Gender:       "M",
			Speciality:   "Cardiology",
		},
		{
			UUID:         "receptionist:Carol:" + APIstub.GetTxID(),
			Name:         "Carol",
			Organization: "blr.pesuhospital.com",
			Role:         "receptionist",
		},
		{
			UUID:         "pharmacist:Dave:" + APIstub.GetTxID(),
			Name:         "Dave",
			Organization: "kpm.pesuhospital.com",
			Role:         "pharmacist",
		},
	}

	// Loop over the slice and write each user to the ledger.
	for _, user := range users {
		userJSON, err := json.Marshal(user)
		if err != nil {
			return shim.Error("Error marshaling user data: " + err.Error())
		}

		// Store the user using their UUID as the key.
		err = APIstub.PutState(user.UUID, userJSON)
		if err != nil {
			return shim.Error("Error putting user state: " + err.Error())
		}
	}

	return shim.Success([]byte("Ledger initialized with sample users"))
}

// ---------- Registration Channel Methods ---------- //

func (s *SmartContract) registerUser(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [name, organization, role]
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}
	user := User{
		UUID:         "user:" + args[0] + ":" + APIstub.GetTxID(),
		Name:         args[0],
		Organization: args[1],
		Role:         args[2],
	}
	userJSON, err := json.Marshal(user)
	if err != nil {
		return shim.Error(err.Error())
	}
	APIstub.PutState(user.UUID, userJSON)
	return shim.Success(userJSON)
}

func (s *SmartContract) registerPatient(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [name, age, organization, gender]
	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}
	age, err := strconv.Atoi(args[1])
	if err != nil {
		return shim.Error("Age must be a number")
	}
	user := User{
		UUID:         "patient:" + args[0] + ":" + APIstub.GetTxID(),
		Name:         args[0],
		Organization: args[2],
		Role:         "patient",
		Gender:       args[3],
		Age:          age,
	}
	userJSON, err := json.Marshal(user)
	if err != nil {
		return shim.Error(err.Error())
	}
	APIstub.PutState(user.UUID, userJSON)
	return shim.Success(userJSON)
}

func (s *SmartContract) registerDoctor(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [name, gender, speciality, organization]
	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}
	user := User{
		UUID:         "doctor:" + args[0] + ":" + APIstub.GetTxID(),
		Name:         args[0],
		Organization: args[3],
		Role:         "doctor",
		Gender:       args[1],
		Speciality:   args[2],
	}
	userJSON, err := json.Marshal(user)
	if err != nil {
		return shim.Error(err.Error())
	}
	APIstub.PutState(user.UUID, userJSON)
	return shim.Success(userJSON)
}

func (s *SmartContract) patientCheckIn(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}

	role, found, err := clientID.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading attribute 'role': " + err.Error())
	}
	if !found || role != "receptionist" {
		return shim.Error("Unauthorized: Only receptionists can perform check-ins")
	}

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}

	var patient map[string]interface{}
	patientBytes, err := APIstub.GetState(args[0])
	if err != nil || patientBytes == nil {
		return shim.Error("Patient not found")
	}

	json.Unmarshal(patientBytes, &patient)
	patient["assignedDoctor"] = args[1]
	patient["status"] = args[3]
	updatedBytes, _ := json.Marshal(patient)
	APIstub.PutState(args[0], updatedBytes)

	return shim.Success(updatedBytes)
}

func (s *SmartContract) checkOut(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}

	role, found, err := clientID.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading attribute 'role': " + err.Error())
	}
	if !found || role != "receptionist" {
		return shim.Error("Unauthorized: Only receptionists can perform check-out")
	}

	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 4")
	}

	var patient map[string]interface{}
	patientBytes, err := APIstub.GetState(args[0])
	if err != nil || patientBytes == nil {
		return shim.Error("Patient not found")
	}

	json.Unmarshal(patientBytes, &patient)
	patient["status"] = args[3]

	updatedBytes, err := json.Marshal(patient)
	if err != nil {
		return shim.Error("Failed to serialize patient data: " + err.Error())
	}

	err = APIstub.PutState(args[0], updatedBytes)
	if err != nil {
		return shim.Error("Failed to update patient record: " + err.Error())
	}

	return shim.Success(updatedBytes)
}

// ---------- Patient-Medication Channel Methods ---------- //

func (s *SmartContract) createMedicalRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}

	
	role, found, err := clientID.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading attribute 'role': " + err.Error())
	}
	if !found || role != "doctor" {
		return shim.Error("Unauthorized: Only users with the 'doctor' role can create medical records")
	}

	
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3: patientID, doctorID, encryptedPayload")
	}

	recordID := "medrec:" + APIstub.GetTxID()

	encryptedPayload := args[2] // This is a JSON string like: {ciphertext, nonce, senderPublicKey}

	// Just wrap it with metadata for reference (optional)
	recordWrapper := map[string]interface{}{
		"recordID":  recordID,
		"patientID": args[0],
		"doctorID":  args[1],
		"encrypted": json.RawMessage(encryptedPayload),
	}

	recJSON, err := json.Marshal(recordWrapper)
	if err != nil {
		return shim.Error("Failed to marshal record: " + err.Error())
	}

	
	err = APIstub.PutPrivateData("PrivateMedicalRecords", recordID, recJSON)
	if err != nil {
		return shim.Error("Failed to store medical record: " + err.Error())
	}

	return shim.Success(recJSON)
}

func (s *SmartContract) getMedicalRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [recordID, receiverID, mccAuthToken]
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	
	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}

	
	role, found, err := clientID.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading attribute 'role': " + err.Error())
	}
	if !found || (role != "patient") {
		return shim.Error("Unauthorized: Only users with 'patient' role can retrieve medical records")
	}

	
	recJSON, err := APIstub.GetPrivateData("PrivateMedicalRecords", args[0])
	if err != nil {
		return shim.Error("Failed to read medical record: " + err.Error())
	}
	if recJSON == nil {
		return shim.Error("Medical record not found")
	}

	return shim.Success(recJSON)
}

func (s *SmartContract) updateMedicalRecord(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [recordID, doctorID, field, newValue, mccAuthToken]
	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}
	recJSON, err := APIstub.GetPrivateData("PrivateMedicalRecords", args[0])
	if err != nil || recJSON == nil {
		return shim.Error("Medical record not found")
	}
	var record map[string]interface{}
	json.Unmarshal(recJSON, &record)
	record[args[2]] = args[3]
	updatedJSON, _ := json.Marshal(record)
	err = APIstub.PutPrivateData("PrivateMedicalRecords", args[0], updatedJSON)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(updatedJSON)
}

func (s *SmartContract) createPrescription(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3: patientID, doctorID, encryptedPayload")
	}

	
	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}

	
	role, found, err := clientID.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading 'role' attribute: " + err.Error())
	}
	if !found || role != "doctor" {
		return shim.Error("Unauthorized: Only users with the 'doctor' role can create prescriptions")
	}

	
	prescriptionID := "presc:" + APIstub.GetTxID()

	payloadWrapper := map[string]interface{}{
		"prescriptionID": prescriptionID,
		"patientID":      args[0],
		"doctorID":       args[1],
		"encrypted":      json.RawMessage(args[2]), // This will be a JSON object with ciphertext, nonce, etc.
	}

	payloadBytes, err := json.Marshal(payloadWrapper)
	if err != nil {
		return shim.Error("Failed to marshal prescription payload: " + err.Error())
	}

	err = APIstub.PutPrivateData("PrivatePrescriptions", prescriptionID, payloadBytes)
	if err != nil {
		return shim.Error("Failed to store prescription: " + err.Error())
	}

	return shim.Success(payloadBytes)
}

func (s *SmartContract) getPrescription(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [prescriptionID, receiverID, mccAuthToken]
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3: prescriptionID, receiverID, mccAuthToken")
	}

	
	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}

	role, found, err := clientID.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error retrieving 'role' attribute: " + err.Error())
	}
	if !found || role != "pharmacist" {
		return shim.Error("Unauthorized: Only users with the 'pharmacist' role can access prescriptions")
	}

	
	prescriptionID := args[0]
	prescJSON, err := APIstub.GetPrivateData("PrivatePrescriptions", prescriptionID)
	if err != nil {
		return shim.Error("Failed to retrieve prescription: " + err.Error())
	}
	if prescJSON == nil {
		return shim.Error("Prescription not found")
	}

	return shim.Success(prescJSON)
}

func (s *SmartContract) updatePrescription(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [prescriptionID, doctorID, field, newValue, mccAuthToken]
	if len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 5")
	}
	prescJSON, err := APIstub.GetPrivateData("PrivatePrescriptions", args[0])
	if err != nil || prescJSON == nil {
		return shim.Error("Prescription not found")
	}
	var presc map[string]interface{}
	json.Unmarshal(prescJSON, &presc)
	presc[args[2]] = args[3]
	updatedJSON, _ := json.Marshal(presc)
	err = APIstub.PutPrivateData("PrivatePrescriptions", args[0], updatedJSON)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(updatedJSON)
}

func (s *SmartContract) dispenseMedication(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [prescriptionID, pharmacistID, encryptedPrescriptionJSON]
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3: prescriptionID, pharmacistID, encryptedPrescriptionJSON")
	}

	// Check caller's role is pharmacist
	role, _, err := cid.GetAttributeValue(APIstub, "role")
	if err != nil {
		return shim.Error("Failed to get client role attribute")
	}
	if role != "pharmacist" {
		return shim.Error("Access denied. Only pharmacists can dispense medication")
	}

	prescriptionID := args[0]
	// pharmacistID := args[1] // Can be used for logging or other optional verification

	encryptedData := []byte(args[2])

	// Overwrite the existing encrypted record in private data store
	err = APIstub.PutPrivateData("PrivatePrescriptions", prescriptionID, encryptedData)
	if err != nil {
		return shim.Error("Failed to store updated prescription: " + err.Error())
	}

	return shim.Success(encryptedData)
}

// ---------- Billing Channel Method ---------- //
func (s *SmartContract) billing(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	clientID, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Unable to retrieve client identity")
	}

	role, ok, err := clientID.GetAttributeValue("role")
	if err != nil || !ok || role != "receptionist" {
		return shim.Error("Access denied. Only users with role 'receptionist' can call this function")
	}

	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	amount, err := strconv.ParseFloat(args[1], 64)
	if err != nil {
		return shim.Error("Bill amount must be a float")
	}

	bill := BillingRecord{
		RecordID:  "bill:" + APIstub.GetTxID(),
		PatientID: args[0],
		Amount:    amount,
		Status:    args[2],
	}

	billJSON, err := json.Marshal(bill)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = APIstub.PutState(bill.RecordID, billJSON)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(billJSON)
}

// ---------- Communication Channel Methods ---------- //

func (s *SmartContract) sendMessage(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [senderID, recipientID, message]
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}
	msg := Message{
		ID:      "msg:" + args[0] + ":" + APIstub.GetTxID(),
		FromID:  args[0],
		ToID:    args[1],
		Content: args[2],
		Channel: "patient-medication-channel",
	}
	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return shim.Error(err.Error())
	}
	APIstub.PutState(msg.ID, msgJSON)
	return shim.Success(msgJSON)
}

func (s *SmartContract) getMessages(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects exactly one argument: recipientID in format "user:<CommonName>:<hash>"
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1: recipientID")
	}

	// Split out the CommonName from your passed-in recipientID
	parts := strings.Split(args[0], ":")
	if len(parts) < 2 {
		return shim.Error("Invalid recipientID format, must be user:<CommonName>:<hash>")
	}
	requestedCN := parts[1] // the enrollment CN you care about

	// Retrieve the caller’s certificate and extract its CommonName
	cert, err := cid.GetX509Certificate(APIstub)
	if err != nil {
		return shim.Error("Failed to get client certificate: " + err.Error())
	}
	callerCN := cert.Subject.CommonName

	// Enforce that callers can only fetch their own messages
	if callerCN != requestedCN {
		return shim.Error("Unauthorized: You can only query messages for yourself")
	}

	// Build a CouchDB selector to fetch messages where toId == full args[0]
	query := fmt.Sprintf(`{"selector":{"toId":"%s"}}`, args[0])
	resultsIter, err := APIstub.GetQueryResult(query)
	if err != nil {
		return shim.Error("Query failed: " + err.Error())
	}
	defer resultsIter.Close()

	// Accumulate results into a JSON array
	var buffer bytes.Buffer
	buffer.WriteString("[")
	first := true
	for resultsIter.HasNext() {
		resp, err := resultsIter.Next()
		if err != nil {
			return shim.Error("Iterator error: " + err.Error())
		}
		if !first {
			buffer.WriteString(",")
		}
		buffer.Write(resp.Value)
		first = false
	}
	buffer.WriteString("]")

	return shim.Success(buffer.Bytes())
}

// ---------- Query Function ---------- //

func (s *SmartContract) queryPatientsByDoctor(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects: [doctorID]
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	// Use the correct field name "assignedDoctor"
	query := fmt.Sprintf(`{"selector":{"assignedDoctor":"%s"}}`, args[0])
	resultsIterator, err := APIstub.GetQueryResult(query)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	var buffer bytes.Buffer
	buffer.WriteString("[")
	first := true
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		if !first {
			buffer.WriteString(",")
		}
		buffer.Write(response.Value)
		first = false
	}
	buffer.WriteString("]")

	return shim.Success(buffer.Bytes())
}

func main() {
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error starting Smart Contract: %s", err)
	}
}
