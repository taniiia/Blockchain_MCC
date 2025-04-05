package models

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Session represents an authentication session.
type Session struct {
	ID              string    `json:"id"`
	IsAuthenticated bool      `json:"isAuthenticated"`
	ExpiresAt       time.Time `json:"expiresAt"`
}

// GenerateSessionID creates a session ID using two user IDs and the channel.
func GenerateSessionID(user1ID, user2ID, channelID string) string {
	return fmt.Sprintf("session:%s:%s:%s", user1ID, user2ID, channelID)
}

// VerifySession checks if a session is valid and authenticated.
func VerifySession(ctx contractapi.TransactionContextInterface, sessionID string) (bool, error) {
	sessionJSON, err := ctx.GetStub().GetState(sessionID)
	if err != nil {
		return false, fmt.Errorf("failed to get session: %v", err)
	}
	if sessionJSON == nil {
		return false, fmt.Errorf("session not found")
	}
	var session Session
	if err := json.Unmarshal(sessionJSON, &session); err != nil {
		return false, fmt.Errorf("failed to unmarshal session: %v", err)
	}
	if time.Now().After(session.ExpiresAt) {
		return false, fmt.Errorf("session expired, please initiate a new session")
	}
	return session.IsAuthenticated, nil
}
