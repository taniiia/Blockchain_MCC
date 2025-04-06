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

// PutPrivateData implements shim.ChaincodeStubInterface.
func (ds *dummyStub) PutPrivateData(collection string, key string, value []byte) error {
	panic("unimplemented")
}

// Implement only GetState and PutState needed for our tests.
func (ds *dummyStub) GetState(key string) ([]byte, error) {
	return ds.state[key], nil
}

func (ds *dummyStub) PutState(key string, value []byte) error {
	ds.state[key] = value
	return nil
}

func (ds *dummyStub) DelState(key string) error {
	delete(ds.state, key)
	return nil
}

// Other methods can panic as they are not used in these tests.
func (ds *dummyStub) CreateCompositeKey(objectType string, attributes []string) (string, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetArgs() [][]byte                            { panic("unimplemented") }
func (ds *dummyStub) GetArgsSlice() ([]byte, error)                { panic("unimplemented") }
func (ds *dummyStub) GetBinding() ([]byte, error)                  { panic("unimplemented") }
func (ds *dummyStub) GetChannelID() string                         { panic("unimplemented") }
func (ds *dummyStub) GetCreator() ([]byte, error)                  { panic("unimplemented") }
func (ds *dummyStub) GetDecorations() map[string][]byte            { panic("unimplemented") }
func (ds *dummyStub) GetFunctionAndParameters() (string, []string) { panic("unimplemented") }
func (ds *dummyStub) GetHistoryForKey(key string) (shim.HistoryQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetPrivateData(collection, key string) ([]byte, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetPrivateDataByPartialCompositeKey(collection, objectType string, keys []string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetPrivateDataByRange(collection, startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetPrivateDataHash(collection, key string) ([]byte, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetPrivateDataQueryResult(collection, query string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetPrivateDataValidationParameter(collection, key string) ([]byte, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetQueryResult(query string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetQueryResultWithPagination(query string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetSignedProposal() (*peer.SignedProposal, error) { panic("unimplemented") }
func (ds *dummyStub) GetStateByPartialCompositeKey(objectType string, keys []string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetStateByPartialCompositeKeyWithPagination(objectType string, keys []string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetStateByRange(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetStateByRangeWithPagination(startKey, endKey string, pageSize int32, bookmark string) (shim.StateQueryIteratorInterface, *peer.QueryResponseMetadata, error) {
	panic("unimplemented")
}
func (ds *dummyStub) GetStateValidationParameter(key string) ([]byte, error) { panic("unimplemented") }
func (ds *dummyStub) GetStringArgs() []string                                { panic("unimplemented") }
func (ds *dummyStub) GetTransient() (map[string][]byte, error)               { panic("unimplemented") }
func (ds *dummyStub) GetTxID() string                                        { panic("unimplemented") }
func (ds *dummyStub) GetTxTimestamp() (*timestamp.Timestamp, error)          { panic("unimplemented") }
func (ds *dummyStub) InvokeChaincode(chaincodeName string, args [][]byte, channel string) peer.Response {
	panic("unimplemented")
}
func (ds *dummyStub) DelPrivateData(collection, key string) error { panic("unimplemented") }
func (ds *dummyStub) CreateCompositeKeyWithParams(objectType string, keys ...string) (string, error) {
	panic("unimplemented")
}
func (ds *dummyStub) SetEvent(name string, payload []byte) error { panic("unimplemented") }
func (ds *dummyStub) SetPrivateDataValidationParameter(collection, key string, ep []byte) error {
	panic("unimplemented")
}
func (ds *dummyStub) SetStateValidationParameter(key string, ep []byte) error { panic("unimplemented") }
func (ds *dummyStub) SplitCompositeKey(compositeKey string) (string, []string, error) {
	panic("unimplemented")
}

// dummyCtx is a minimal dummy implementation of contractapi.TransactionContextInterface.
type dummyCtx struct {
	contractapi.TransactionContextInterface
	stub *dummyStub
}

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

	sessionID := "session:doctor2:patient1:channel"
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
