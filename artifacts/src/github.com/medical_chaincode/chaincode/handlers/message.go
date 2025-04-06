package handlers

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Message represents a communication message on the communication channel.
type Message struct {
	ID        string    `json:"id"`
	FromID    string    `json:"fromId"`
	ToID      string    `json:"toId"`
	Content   string    `json:"content"`
	Channel   string    `json:"channel"` // "communication-channel"
	CreatedAt time.Time `json:"createdAt"`
}

// SendMessage stores a message on the ledger for the communication channel.
func SendMessage(ctx contractapi.TransactionContextInterface, args []string) error {
	if len(args) < 3 {
		return fmt.Errorf("incorrect number of arguments; expecting 3")
	}
	message := Message{
		ID:        fmt.Sprintf("msg:%s:%d", args[0], time.Now().UnixNano()),
		FromID:    args[0],
		ToID:      args[1],
		Content:   args[2],
		Channel:   "communication-channel",
		CreatedAt: time.Now(), // Optionally, this could be set externally.
	}
	msgJSON, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %v", err)
	}
	return ctx.GetStub().PutState(message.ID, msgJSON)
}

// QueryMessages retrieves all messages from the communication channel.
func QueryMessages(ctx contractapi.TransactionContextInterface, args []string) error {
	query := `{"selector":{"channel":"communication-channel"}}`
	resultsIterator, err := ctx.GetStub().GetQueryResult(query)
	if err != nil {
		return fmt.Errorf("failed to query messages: %v", err)
	}
	defer resultsIterator.Close()

	var messages []Message
	for resultsIterator.HasNext() {
		kv, err := resultsIterator.Next()
		if err != nil {
			return fmt.Errorf("failed to iterate messages: %v", err)
		}
		var msg Message
		if err := json.Unmarshal(kv.Value, &msg); err != nil {
			return fmt.Errorf("failed to unmarshal message: %v", err)
		}
		messages = append(messages, msg)
	}
	messagesJSON, err := json.Marshal(messages)
	if err != nil {
		return fmt.Errorf("failed to marshal messages: %v", err)
	}
	return ctx.GetStub().SetEvent("QueryMessages", messagesJSON)
}
