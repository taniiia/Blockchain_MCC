package handlers_test

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/golang/protobuf/ptypes/timestamp"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-protos-go/ledger/queryresult"
	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/stretchr/testify/assert"

	"github.com/taniiia/medical_chaincode/chaincode/auth"
	"github.com/taniiia/medical_chaincode/chaincode/handlers"
	"github.com/taniiia/medical_chaincode/chaincode/models"
)

// --- Dummy Stub Implementation ---

// dummyStub is a simple in-memory implementation of shim.ChaincodeStubInterface.
type dummyStub struct {
	state       map[string][]byte
	privateData map[string]map[string][]byte
	events      map[string][]byte
}

// CreateCompositeKey implements shim.ChaincodeStubInterface.
func (ds *dummyStub) CreateCompositeKey(objectType string, attributes []string) (string, error) {
	panic("unimplemented")
}

// DelPrivateData implements shim.ChaincodeStubInterface.
func (ds *dummyStub) DelPrivateData(collection string, key string) error {
	panic("unimplemented")
}

// DelState implements shim.ChaincodeStubInterface.
func (ds *dummyStub) DelState(key string) error {
	panic("unimplemented")
}

// GetArgs implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetArgs() [][]byte {
	panic("unimplemented")
}

// GetArgsSlice implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetArgsSlice() ([]byte, error) {
	panic("unimplemented")
}

// GetBinding implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetBinding() ([]byte, error) {
	panic("unimplemented")
}

// GetChannelID implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetChannelID() string {
	panic("unimplemented")
}

// GetCreator implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetCreator() ([]byte, error) {
	panic("unimplemented")
}

// GetDecorations implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetDecorations() map[string][]byte {
	panic("unimplemented")
}

// GetFunctionAndParameters implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetFunctionAndParameters() (string, []string) {
	panic("unimplemented")
}

// GetHistoryForKey implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetHistoryForKey(key string) (shim.HistoryQueryIteratorInterface, error) {
	panic("unimplemented")
}

// GetPrivateDataByPartialCompositeKey implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetPrivateDataByPartialCompositeKey(collection string, objectType string, keys []string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}

// GetPrivateDataByRange implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetPrivateDataByRange(collection string, startKey string, endKey string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}

// GetPrivateDataHash implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetPrivateDataHash(collection string, key string) ([]byte, error) {
	panic("unimplemented")
}

// GetPrivateDataQueryResult implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetPrivateDataQueryResult(collection string, query string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}

// GetPrivateDataValidationParameter implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetPrivateDataValidationParameter(collection string, key string) ([]byte, error) {
	panic("unimplemented")
}

// GetQueryResultWithPagination implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetQueryResultWithPagination(query string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	panic("unimplemented")
}

// GetSignedProposal implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetSignedProposal() (*peer.SignedProposal, error) {
	panic("unimplemented")
}

// GetStateByPartialCompositeKey implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetStateByPartialCompositeKey(objectType string, keys []string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}

// GetStateByPartialCompositeKeyWithPagination implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetStateByPartialCompositeKeyWithPagination(objectType string, keys []string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	panic("unimplemented")
}

// GetStateByRange implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetStateByRange(startKey string, endKey string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}

// GetStateByRangeWithPagination implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetStateByRangeWithPagination(startKey string, endKey string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	panic("unimplemented")
}

// GetStateValidationParameter implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetStateValidationParameter(key string) ([]byte, error) {
	panic("unimplemented")
}

// GetStringArgs implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetStringArgs() []string {
	panic("unimplemented")
}

// GetTransient implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetTransient() (map[string][]byte, error) {
	panic("unimplemented")
}

// GetTxID implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetTxID() string {
	panic("unimplemented")
}

// GetTxTimestamp implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetTxTimestamp() (*timestamp.Timestamp, error) {
	panic("unimplemented")
}

// InvokeChaincode implements shim.ChaincodeStubInterface.
func (ds *dummyStub) InvokeChaincode(chaincodeName string, args [][]byte, channel string) peer.Response {
	panic("unimplemented")
}

// SetPrivateDataValidationParameter implements shim.ChaincodeStubInterface.
func (ds *dummyStub) SetPrivateDataValidationParameter(collection string, key string, ep []byte) error {
	panic("unimplemented")
}

// SetStateValidationParameter implements shim.ChaincodeStubInterface.
func (ds *dummyStub) SetStateValidationParameter(key string, ep []byte) error {
	panic("unimplemented")
}

// SplitCompositeKey implements shim.ChaincodeStubInterface.
func (ds *dummyStub) SplitCompositeKey(compositeKey string) (string, []string, error) {
	panic("unimplemented")
}

// newDummyStub creates a new dummyStub.
func newDummyStub() *dummyStub {
	return &dummyStub{
		state:       make(map[string][]byte),
		privateData: make(map[string]map[string][]byte),
		events:      make(map[string][]byte),
	}
}

func (ds *dummyStub) GetState(key string) ([]byte, error) {
	return ds.state[key], nil
}

func (ds *dummyStub) PutState(key string, value []byte) error {
	ds.state[key] = value
	return nil
}

func (ds *dummyStub) GetPrivateData(collection, key string) ([]byte, error) {
	if coll, ok := ds.privateData[collection]; ok {
		return coll[key], nil
	}
	return nil, nil
}

func (ds *dummyStub) PutPrivateData(collection, key string, value []byte) error {
	if ds.privateData == nil {
		ds.privateData = make(map[string]map[string][]byte)
	}
	if _, ok := ds.privateData[collection]; !ok {
		ds.privateData[collection] = make(map[string][]byte)
	}
	ds.privateData[collection][key] = value
	return nil
}

func (ds *dummyStub) SetEvent(name string, payload []byte) error {
	ds.events[name] = payload
	return nil
}

// GetQueryResult simulates a query by examining stored values.
// If the query contains "channel", we assume it targets messages;
// if it contains "patientId", we assume it targets billing records.
func (ds *dummyStub) GetQueryResult(query string) (shim.StateQueryIteratorInterface, error) {
	var results []struct {
		Key   string
		Value []byte
	}
	if strings.Contains(query, "channel") {
		// Expected query: {"selector":{"channel":"communication-channel"}}
		parts := strings.Split(query, "\"")
		desiredChannel := ""
		if len(parts) > 5 {
			desiredChannel = parts[5]
		}
		// Iterate over all state entries and check Message's channel.
		for k, v := range ds.state {
			var msg handlers.Message
			if err := json.Unmarshal(v, &msg); err == nil {
				if msg.Channel == desiredChannel {
					results = append(results, struct {
						Key   string
						Value []byte
					}{Key: k, Value: v})
				}
			}
		}
	} else if strings.Contains(query, "patientId") {
		// Expected query: {"selector":{"patientId":"patient123"}}
		parts := strings.Split(query, "\"")
		desiredPatient := ""
		if len(parts) > 5 {
			desiredPatient = parts[5]
		}
		// Iterate over state entries and check BillingRecord's patientId.
		for k, v := range ds.state {
			var record models.BillingRecord
			if err := json.Unmarshal(v, &record); err == nil {
				if record.PatientID == desiredPatient {
					results = append(results, struct {
						Key   string
						Value []byte
					}{Key: k, Value: v})
				}
			}
		}
	}
	return newDummyIterator(results), nil
}

// --- Dummy Iterator Implementation ---

type dummyIterator struct {
	results []struct {
		Key   string
		Value []byte
	}
	index int
}

func newDummyIterator(results []struct {
	Key   string
	Value []byte
}) shim.StateQueryIteratorInterface {
	return &dummyIterator{results: results, index: 0}
}

func (di *dummyIterator) HasNext() bool {
	return di.index < len(di.results)
}

func (di *dummyIterator) Next() (*queryresult.KV, error) {
	if !di.HasNext() {
		return nil, fmt.Errorf("no more items")
	}
	item := di.results[di.index]
	di.index++
	return &queryresult.KV{Key: item.Key, Value: item.Value}, nil
}

func (di *dummyIterator) Close() error {
	return nil
}

// Helper to extract a prefix from a JSON query string.
func extractPrefix(query string) string {
	parts := strings.Split(query, "\"")
	if len(parts) > 3 {
		return parts[3]
	}
	return ""
}

// --- Dummy Context Implementation ---

type dummyContext struct {
	contractapi.TransactionContextInterface
	stub *dummyStub
}

func (dc *dummyContext) GetStub() shim.ChaincodeStubInterface {
	return dc.stub
}

// --- Test Setup Helpers ---

func setUserState(t *testing.T, stub *dummyStub, user auth.User) {
	userKey := fmt.Sprintf("user:%s", user.ID)
	userJSON, err := json.Marshal(user)
	assert.NoError(t, err)
	err = stub.PutState(userKey, userJSON)
	assert.NoError(t, err)
}

// --- Tests ---

func TestCreateMedicalRecord(t *testing.T) {
	stub := newDummyStub()
	ctx := &dummyContext{stub: stub}

	doctor := auth.User{
		ID:           "doctor1",
		Name:         "Dr. Bob",
		Role:         "doctor",
		Organization: "blr.pesuhospital.com",
		PublicKey:    "pubkey-doctor1",
	}
	setUserState(t, stub, doctor)

	patientHandler := handlers.NewPatientHandler(ctx)
	err := patientHandler.CreateMedicalRecord("doctor1", "patient123", "Flu", "Rest and hydration")
	assert.NoError(t, err, "Doctor should be able to create a medical record")

	// Verify that the record exists in the private data collection.
	var found bool
	var recordBytes []byte
	if ds, ok := stub.privateData["PrivateMedicalRecords"]; ok {
		for key, value := range ds {
			if strings.HasPrefix(key, "medical:") {
				found = true
				recordBytes = value
				break
			}
		}
	}
	assert.True(t, found, "Medical record should be stored in PrivateMedicalRecords")
	// Unmarshal and check content.
	var record models.MedicalRecord
	err = json.Unmarshal(recordBytes, &record)
	assert.NoError(t, err, "Unmarshal of medical record should not error")
	assert.Equal(t, "Flu", record.Diagnosis, "Diagnosis should be 'Flu'")
}

func TestCheckInAndCheckOut(t *testing.T) {
	stub := newDummyStub()
	ctx := &dummyContext{stub: stub}

	receptionist := auth.User{
		ID:           "receptionist1",
		Name:         "Diana Reception",
		Role:         "receptionist",
		Organization: "blr.pesuhospital.com",
		PublicKey:    "pubkey-receptionist1",
	}
	setUserState(t, stub, receptionist)

	patientHandler := handlers.NewPatientHandler(ctx)
	err := patientHandler.CheckIn("receptionist1", "patient123")
	assert.NoError(t, err, "Receptionist should be able to check in a patient")

	err = patientHandler.CheckOut("receptionist1", "patient123")
	assert.NoError(t, err, "Receptionist should be able to check out a patient")
}

func TestUpdateMedicalRecord(t *testing.T) {
	stub := newDummyStub()
	ctx := &dummyContext{stub: stub}

	doctor := auth.User{
		ID:           "doctor1",
		Name:         "Dr. Bob",
		Role:         "doctor",
		Organization: "blr.pesuhospital.com",
		PublicKey:    "pubkey-doctor1",
	}
	setUserState(t, stub, doctor)

	patientHandler := handlers.NewPatientHandler(ctx)
	err := patientHandler.CreateMedicalRecord("doctor1", "patient123", "Flu", "Rest and hydration")
	assert.NoError(t, err)

	var recordID string
	if ds, ok := stub.privateData["PrivateMedicalRecords"]; ok {
		for key := range ds {
			if strings.HasPrefix(key, "medical:") {
				recordID = key
				break
			}
		}
	}
	assert.NotEmpty(t, recordID, "Record ID should not be empty")

	doctorHandler := handlers.NewDoctorHandler(ctx)
	err = doctorHandler.UpdateMedicalRecord("doctor1", recordID, "Flu Updated", "Medication", "Updated notes")
	assert.NoError(t, err, "Doctor should be able to update medical record")

	// Retrieve the updated record and check the fields.
	updatedRecordBytes, err := stub.GetPrivateData("PrivateMedicalRecords", recordID)
	assert.NoError(t, err, "Should retrieve updated medical record")
	var updatedRecord models.MedicalRecord
	err = json.Unmarshal(updatedRecordBytes, &updatedRecord)
	assert.NoError(t, err, "Unmarshal should not error")
	assert.Equal(t, "Flu Updated", updatedRecord.Diagnosis, "Diagnosis should be updated")
	assert.Equal(t, "Medication", updatedRecord.Treatment, "Treatment should be updated")
	assert.Equal(t, "Updated notes", updatedRecord.Notes, "Notes should be updated")
}

func TestSendAndQueryMessages(t *testing.T) {
	stub := newDummyStub()
	ctx := &dummyContext{stub: stub}

	err := handlers.SendMessage(ctx, []string{"receptionist1", "doctor1", "Patient 123 is ready for checkout"})
	assert.NoError(t, err, "Message should be sent without error")

	err = handlers.QueryMessages(ctx, []string{})
	assert.NoError(t, err, "QueryMessages should not error")
	event, exists := stub.events["QueryMessages"]
	assert.True(t, exists, "QueryMessages should set an event")
	var messages []handlers.Message
	err = json.Unmarshal(event, &messages)
	assert.NoError(t, err, "Unmarshal messages should not error")
	assert.GreaterOrEqual(t, len(messages), 1, "There should be at least one message")
	// Check the message content.
	assert.Equal(t, "Patient 123 is ready for checkout", messages[0].Content, "Message content should match")
}

func TestBillingFunctions(t *testing.T) {
	stub := newDummyStub()
	ctx := &dummyContext{stub: stub}

	receptionist := auth.User{
		ID:           "receptionist1",
		Name:         "Diana Reception",
		Role:         "receptionist",
		Organization: "blr.pesuhospital.com",
		PublicKey:    "pubkey-receptionist1",
	}
	setUserState(t, stub, receptionist)

	receptionistHandler := handlers.NewReceptionistHandler(ctx)
	patient := models.Patient{
		ID:             "patient123",
		Name:           "John Doe",
		Age:            45,
		MedicalHistory: "None",
		Fees:           0,
	}
	err := receptionistHandler.RegisterPatient("receptionist1", patient)
	assert.NoError(t, err, "Receptionist should register a patient")

	billingRecord := map[string]interface{}{
		"patientId": "patient123",
		"amount":    500,
		"status":    "pending",
	}
	err = receptionistHandler.CreateBillingRecord("receptionist1", "billing123", billingRecord)
	assert.NoError(t, err, "Receptionist should create a billing record")

	err = receptionistHandler.UpdateBillingStatus("receptionist1", "billing123", "paid")
	assert.NoError(t, err, "Receptionist should update billing status")

	// Retrieve the billing record and verify status.
	billBytes, err := stub.GetState("billing123")
	assert.NoError(t, err, "Should retrieve billing record")
	var bill models.BillingRecord
	err = json.Unmarshal(billBytes, &bill)
	assert.NoError(t, err, "Unmarshal billing record should not error")
	assert.Equal(t, "paid", bill.Status, "Billing record status should be 'paid'")

	records, err := receptionistHandler.GetPatientBillingRecords("receptionist1", "patient123")
	assert.NoError(t, err, "Should retrieve billing records")
	assert.GreaterOrEqual(t, len(records), 1, "There should be at least one billing record")
}

func TestInsuranceFunctions(t *testing.T) {
	stub := newDummyStub()
	ctx := &dummyContext{stub: stub}

	insuranceAgent := auth.User{
		ID:           "insurance1",
		Name:         "Evan Insurance",
		Role:         "insurance-agent",
		Organization: "kpm.pesuhospital.com",
		PublicKey:    "pubkey-insurance1",
	}
	setUserState(t, stub, insuranceAgent)

	billingRecord := map[string]interface{}{
		"patientId": "patient123",
		"amount":    500,
		"status":    "pending",
	}
	err := stub.PutState("billing123", mustJSON(billingRecord))
	assert.NoError(t, err)

	insuranceHandler := handlers.NewInsuranceHandler(ctx)
	update := map[string]interface{}{"status": "approved", "insuranceNotes": "All good"}
	err = insuranceHandler.ReviewBillingRecord("insurance1", "billing123", update)
	assert.NoError(t, err, "Insurance agent should review billing record")

	// Retrieve the billing record to verify the update.
	updatedBillBytes, err := stub.GetState("billing123")
	assert.NoError(t, err, "Should retrieve billing record")
	var updatedBill models.BillingRecord
	err = json.Unmarshal(updatedBillBytes, &updatedBill)
	assert.NoError(t, err, "Unmarshal billing record should not error")
	assert.Equal(t, "approved", updatedBill.Status, "Billing record status should be 'approved'")

	pendingRecords, err := insuranceHandler.GetPendingBillingRecords("insurance1")
	assert.NoError(t, err, "Should retrieve pending billing records")
	// Extra Reason: After review, no billing records should remain pending.
	assert.Equal(t, 0, len(pendingRecords), "Expected zero pending billing records after review")
}

// Helper function to marshal JSON (panics on error for brevity).
func mustJSON(v interface{}) []byte {
	bytes, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return bytes
}
