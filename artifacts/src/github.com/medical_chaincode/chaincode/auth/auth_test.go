package auth

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/golang/protobuf/ptypes/timestamp"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-protos-go/peer"
	"github.com/stretchr/testify/assert"
)

// dummyStub is a minimal in-memory implementation of shim.ChaincodeStubInterface.
type dummyStub struct {
	state map[string][]byte
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

// GetPrivateData implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetPrivateData(collection string, key string) ([]byte, error) {
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

// GetQueryResult implements shim.ChaincodeStubInterface.
func (ds *dummyStub) GetQueryResult(query string) (shim.StateQueryIteratorInterface, error) {
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

// PutPrivateData implements shim.ChaincodeStubInterface.
func (ds *dummyStub) PutPrivateData(collection string, key string, value []byte) error {
	panic("unimplemented")
}

// SetEvent implements shim.ChaincodeStubInterface.
func (ds *dummyStub) SetEvent(name string, payload []byte) error {
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

func (ds *dummyStub) GetState(key string) ([]byte, error) {
	return ds.state[key], nil
}

func (ds *dummyStub) PutState(key string, value []byte) error {
	ds.state[key] = value
	return nil
}

// dummyCtx is a minimal dummy implementation of contractapi.TransactionContextInterface.
type dummyCtx struct {
	contractapi.TransactionContextInterface
	stub *dummyStub
}

// GetStub returns the dummy stub. Note: We now return shim.ChaincodeStubInterface.
func (dc *dummyCtx) GetStub() shim.ChaincodeStubInterface {
	return dc.stub
}

func TestRegisterAndGetUser(t *testing.T) {
	ds := &dummyStub{state: make(map[string][]byte)}
	ctx := &dummyCtx{stub: ds}

	err := RegisterUser(ctx, "doctor2", "Dr. Eve", "doctor", "kpm.pesuhospital.com", "pubkey-doctor2")
	assert.NoError(t, err, "RegisterUser should not error")

	userJSON, err := ds.GetState("user:doctor2")
	assert.NoError(t, err, "GetState should not error")
	assert.NotNil(t, userJSON, "User data should exist")

	var user User
	err = json.Unmarshal(userJSON, &user)
	assert.NoError(t, err, "Unmarshal should not error")
	assert.Equal(t, "Dr. Eve", user.Name)
}

func TestSessionLifecycle(t *testing.T) {
	ds := &dummyStub{state: make(map[string][]byte)}
	ctx := &dummyCtx{stub: ds}

	sessionID := "session:doctor2:patient1:patient-medication-channel"
	session := struct {
		ID              string    `json:"id"`
		IsAuthenticated bool      `json:"isAuthenticated"`
		ExpiresAt       time.Time `json:"expiresAt"`
	}{
		ID:              sessionID,
		IsAuthenticated: false,
		ExpiresAt:       time.Now().Add(1 * time.Hour),
	}
	sessionBytes, _ := json.Marshal(session)
	ds.state[sessionID] = sessionBytes

	err := CompleteAuthentication(ctx, sessionID, "dummy-secret")
	assert.NoError(t, err, "CompleteAuthentication should not error")
}
