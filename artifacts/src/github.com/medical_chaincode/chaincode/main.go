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
	PharmacistID   string   `json:"pharmacistId"`
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
	case "queryAllPatients":
		return s.queryAllPatients(APIstub, args)
	case "queryAllDoctors":
		return s.queryAllDoctors(APIstub, args)
	// Query function
	case "queryPatientsByDoctor":
		return s.queryPatientsByDoctor(APIstub, args)
	case "queryAllUsers":
		return s.queryAllUsers(APIstub, args)
	case "getUserByUsername":
		return s.getUserByUsername(APIstub, args)
	case "queryMedicalRecordsByPatient":
		return s.queryMedicalRecordsByPatient(APIstub, args)
	case "queryRecordsByPatient":
		return s.queryRecordsByPatient(APIstub, args)
	case "queryAllPharmacists":
		return s.queryAllPharmacists(APIstub, args)
	case "queryPrescriptionsByPharmacist":
		return s.queryPrescriptionsByPharmacist(APIstub, args)
	default:
		return shim.Error("Invalid Smart Contract function name.")
	}
}

func (s *SmartContract) queryPrescriptionsByPharmacist(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Expecting 1 arg: pharmacistID")
	}
	pid := args[0]

	// auth: caller CN must match pharmacist login
	cert, err := cid.GetX509Certificate(APIstub)
	if err != nil {
		return shim.Error("cert error: " + err.Error())
	}
	cn := cert.Subject.CommonName
	if cn != strings.Split(pid, ":")[1] {
		return shim.Error("Unauthorized")
	}

	// couch query on private collection
	q := fmt.Sprintf(`{"selector":{"pharmacistId":"%s"}}`, pid)
	iter, err := APIstub.GetPrivateDataQueryResult("PrivatePrescriptions", q)
	if err != nil {
		return shim.Error("Query failed: " + err.Error())
	}
	defer iter.Close()

	var ids []string
	for iter.HasNext() {
		kv, _ := iter.Next()
		ids = append(ids, kv.Key)
	}
	out, _ := json.Marshal(ids)
	return shim.Success(out)
}

// Query all pharmacists by role == "pharmacist"
func (s *SmartContract) queryAllPharmacists(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 0 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}
	// CouchDB selector for role = pharmacist
	query := `{"selector":{"role":"pharmacist"}}`
	resultsIter, err := APIstub.GetQueryResult(query)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIter.Close()

	var pharmacists []map[string]interface{}
	for resultsIter.HasNext() {
		kv, err := resultsIter.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		var obj map[string]interface{}
		if err := json.Unmarshal(kv.Value, &obj); err != nil {
			return shim.Error(err.Error())
		}
		pharmacists = append(pharmacists, obj)
	}

	payload, err := json.Marshal(pharmacists)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(payload)
}

// Query all medical record IDs for the caller (patient or doctor)
func (s *SmartContract) queryRecordsByPatient(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// we ignore args; derive caller CN
	cert, err := cid.GetX509Certificate(APIstub)
	if err != nil {
		return shim.Error("Failed to get client certificate: " + err.Error())
	}
	caller := cert.Subject.CommonName

	// selector on patientID (you stored the full key in recordID)
	query := fmt.Sprintf(`{"selector":{"patientID":"%s"}}`, caller)
	iter, err := APIstub.GetQueryResult(query)
	if err != nil {
		return shim.Error("Query failed: " + err.Error())
	}
	defer iter.Close()

	var ids []string
	for iter.HasNext() {
		kv, _ := iter.Next()
		var rec map[string]interface{}
		if err := json.Unmarshal(kv.Value, &rec); err != nil {
			continue
		}
		if id, ok := rec["recordID"].(string); ok {
			ids = append(ids, id)
		}
	}
	out, _ := json.Marshal(ids)
	return shim.Success(out)
}

// List all private-medrec IDs for a given patientID
func (s *SmartContract) queryMedicalRecordsByPatient(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Expecting patientID")
	}
	pid := args[0]
	// you used PrivateMedicalRecords collection
	// use GetPrivateDataByPartialCompositeKey or a couch query; assuming couch:
	q := fmt.Sprintf(`{"selector":{"patientID":"%s"}}`, pid)
	it, err := APIstub.GetPrivateDataQueryResult("PrivateMedicalRecords", q)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer it.Close()
	var ids []string
	for it.HasNext() {
		r, _ := it.Next()
		ids = append(ids, r.Key)
	}
	out, _ := json.Marshal(ids)
	return shim.Success(out)
}

func (s *SmartContract) getUserByUsername(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	loginName := args[0]
	// query on the "name" field inside your stored JSON
	queryString := fmt.Sprintf(`{"selector":{"name":"%s"}}`, loginName)

	resultsIter, err := APIstub.GetQueryResult(queryString)
	if err != nil {
		return shim.Error("Query failed: " + err.Error())
	}
	defer resultsIter.Close()

	for resultsIter.HasNext() {
		kv, err := resultsIter.Next()
		if err != nil {
			return shim.Error("Iterator error: " + err.Error())
		}
		// this is the full JSON blob for your user
		return shim.Success(kv.Value)
	}
	return shim.Error("User not found")
}

func (s *SmartContract) queryAllPatients(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// No args expected
	if len(args) != 0 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}

	resultsIterator, err := APIstub.GetStateByRange("", "")
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	var patients []map[string]interface{}
	for resultsIterator.HasNext() {
		res, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		key := res.Key
		if strings.HasPrefix(key, "patient:") {
			var obj map[string]interface{}
			if err := json.Unmarshal(res.Value, &obj); err != nil {
				return shim.Error(err.Error())
			}
			patients = append(patients, obj)
		}
	}

	payload, err := json.Marshal(patients)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(payload)
}

// Query all doctors by prefix "doctor:"
func (s *SmartContract) queryAllDoctors(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 0 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}

	resultsIterator, err := APIstub.GetStateByRange("", "")
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	var doctors []map[string]interface{}
	for resultsIterator.HasNext() {
		res, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		key := res.Key
		if strings.HasPrefix(key, "doctor:") {
			var obj map[string]interface{}
			if err := json.Unmarshal(res.Value, &obj); err != nil {
				return shim.Error(err.Error())
			}
			doctors = append(doctors, obj)
		}
	}

	payload, err := json.Marshal(doctors)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(payload)
}

func (s *SmartContract) queryAllUsers(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	if len(args) != 0 {
		return shim.Error("Expecting 0 args")
	}
	iter, err := APIstub.GetStateByRange("", "")
	if err != nil {
		return shim.Error(err.Error())
	}
	defer iter.Close()

	var all []map[string]interface{}
	for iter.HasNext() {
		kv, err := iter.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		key := kv.Key
		// only user records: prefix "user:", "patient:", "doctor:", "pharmacist:", "receptionist:"
		if strings.HasPrefix(key, "user:") ||
			strings.HasPrefix(key, "patient:") ||
			strings.HasPrefix(key, "doctor:") ||
			strings.HasPrefix(key, "pharmacist:") ||
			strings.HasPrefix(key, "receptionist:") {
			var obj map[string]interface{}
			if err := json.Unmarshal(kv.Value, &obj); err != nil {
				return shim.Error(err.Error())
			}
			all = append(all, obj)
		}
	}
	out, _ := json.Marshal(all)
	return shim.Success(out)
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

// createPrescription stores a plain Prescription into the PrivatePrescriptions collection.
func (s *SmartContract) createPrescription(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// args: [ patientID, doctorID, pharmacistID, encryptedPayloadJSON ]
	if len(args) != 4 {
		return shim.Error("Expecting 4 args: patientID, doctorID, pharmacistID, encryptedPayload")
	}

	// only doctors may call
	cidObj, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get identity: " + err.Error())
	}
	role, found, err := cidObj.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading role: " + err.Error())
	}
	if !found || role != "doctor" {
		return shim.Error("Unauthorized: only doctors")
	}

	// build the record wrapper
	presc := struct {
		PrescriptionID string          `json:"prescriptionId"`
		PatientID      string          `json:"patientId"`
		DoctorID       string          `json:"doctorId"`
		PharmacistID   string          `json:"pharmacistId"`
		Encrypted      json.RawMessage `json:"encrypted"`
	}{
		PrescriptionID: "presc:" + APIstub.GetTxID(),
		PatientID:      args[0],
		DoctorID:       args[1],
		PharmacistID:   args[2],
		Encrypted:      json.RawMessage(args[3]),
	}

	data, err := json.Marshal(presc)
	if err != nil {
		return shim.Error("Marshal error: " + err.Error())
	}
	if err := APIstub.PutPrivateData("PrivatePrescriptions", presc.PrescriptionID, data); err != nil {
		return shim.Error("PutPrivateData failed: " + err.Error())
	}
	return shim.Success(data)
}

func (s *SmartContract) getPrescription(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// args: [ prescriptionID, pharmacistID, mccAuthTokenJSON ]
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3: prescriptionID, pharmacistID, mccAuthToken")
	}

	// 1) Ensure caller has 'pharmacist' role
	cidObj, err := cid.New(APIstub)
	if err != nil {
		return shim.Error("Failed to get client identity: " + err.Error())
	}
	role, found, err := cidObj.GetAttributeValue("role")
	if err != nil {
		return shim.Error("Error reading 'role' attribute: " + err.Error())
	}
	if !found || role != "pharmacist" {
		return shim.Error("Unauthorized: Only pharmacists may retrieve prescriptions")
	}

	// 2) Ensure caller's CN matches the pharmacistID passed in
	cert, err := cid.GetX509Certificate(APIstub)
	if err != nil {
		return shim.Error("Failed to get client certificate: " + err.Error())
	}
	parts := strings.Split(args[1], ":")
	if len(parts) < 2 || cert.Subject.CommonName != parts[1] {
		return shim.Error("Unauthorized: pharmacist mismatch")
	}

	// 3) (optional) you could parse args[2] here and verify the MCC signature
	//    but since you already did that off‐chain, we'll skip it

	// 4) Fetch the encrypted prescription from the private collection
	recBytes, err := APIstub.GetPrivateData("PrivatePrescriptions", args[0])
	if err != nil {
		return shim.Error("Fetch error: " + err.Error())
	}
	if recBytes == nil {
		return shim.Error("Prescription not found")
	}

	return shim.Success(recBytes)
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
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3: senderID, recipientID, message")
	}
	senderID := args[0]
	recipientID := args[1]
	msgText := args[2]

	// build and store
	txID := APIstub.GetTxID()
	msg := Message{
		ID:      fmt.Sprintf("msg:%s:%s", senderID, txID),
		FromID:  senderID,
		ToID:    recipientID,
		Content: msgText,
		Channel: "patient-medication-channel",
	}
	msgJSON, err := json.Marshal(msg)
	if err != nil {
		return shim.Error("Failed to marshal message: " + err.Error())
	}
	if err := APIstub.PutState(msg.ID, msgJSON); err != nil {
		return shim.Error("Failed to put message state: " + err.Error())
	}
	return shim.Success(msgJSON)
}

// ─── Get Messages ────────────────────────────────────────────────────────
// Unchanged: still expects 1 arg [recipientID], validates caller by X.509 CN
func (s *SmartContract) getMessages(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {
	// Expects exactly one argument: the full state‐key, e.g. "user:An:txid…"
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1: recipientID")
	}

	// 1) parse the CN out of that key
	parts := strings.Split(args[0], ":")
	if len(parts) < 2 {
		return shim.Error("Invalid recipientID format, must be user:<CommonName>:<…>")
	}
	requestedCN := parts[1]

	// 2) get caller’s CN
	cert, err := cid.GetX509Certificate(APIstub)
	if err != nil {
		return shim.Error("Failed to get client certificate: " + err.Error())
	}
	callerCN := cert.Subject.CommonName

	// 3) enforce that callers only fetch their own messages
	if callerCN != requestedCN {
		return shim.Error("Unauthorized: you can only fetch your own messages")
	}

	// 4) pull from CouchDB by full key
	selector := fmt.Sprintf(`{"selector":{"toId":"%s"}}`, args[0])
	iter, err := APIstub.GetQueryResult(selector)
	if err != nil {
		return shim.Error("Query failed: " + err.Error())
	}
	defer iter.Close()

	var buf bytes.Buffer
	buf.WriteString("[")
	first := true
	for iter.HasNext() {
		resp, _ := iter.Next()
		if !first {
			buf.WriteString(",")
		}
		buf.Write(resp.Value)
		first = false
	}
	buf.WriteString("]")
	return shim.Success(buf.Bytes())
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
