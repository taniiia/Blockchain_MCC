package auth

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/taniiia/medical_chaincode/chaincode/models"
)

// User represents a user in the system.
type User struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	Organization string    `json:"organization"`
	PublicKey    string    `json:"publicKey"`
	CreatedAt    time.Time `json:"createdAt"`
}

// RegisterUser registers a new user with their public key.
func RegisterUser(ctx contractapi.TransactionContextInterface, userID, name, role, organization, publicKey string) error {
	userKey := fmt.Sprintf("user:%s", userID)
	existingUser, err := ctx.GetStub().GetState(userKey)
	if err != nil {
		return fmt.Errorf("failed to check existing user: %v", err)
	}
	if existingUser != nil {
		return fmt.Errorf("user %s already exists", userID)
	}

	user := User{
		ID:           userID,
		Name:         name,
		Role:         role,
		Organization: organization,
		PublicKey:    publicKey,
		CreatedAt:    time.Now(),
	}
	userJSON, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %v", err)
	}
	return ctx.GetStub().PutState(userKey, userJSON)
}

// InitiateAuthentication starts the mutual authentication process using MCC.
func InitiateAuthentication(ctx contractapi.TransactionContextInterface, user1ID, user2ID, channelID string) (*AuthSession, error) {
	// Verify both users exist.
	if _, err := GetUser(ctx, user1ID); err != nil {
		return nil, fmt.Errorf("failed to get user1: %v", err)
	}
	if _, err := GetUser(ctx, user2ID); err != nil {
		return nil, fmt.Errorf("failed to get user2: %v", err)
	}
	sessionID := models.GenerateSessionID(user1ID, user2ID, channelID)
	session := AuthSession{
		// Now using the session model from models/session.go
		Session: models.Session{
			ID:              sessionID,
			IsAuthenticated: false,
			ExpiresAt:       time.Now().Add(24 * time.Hour),
		},
	}
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal session: %v", err)
	}
	if err := ctx.GetStub().PutState(sessionID, sessionJSON); err != nil {
		return nil, fmt.Errorf("failed to store session: %v", err)
	}
	return &session, nil
}
 
// CompleteAuthentication completes the authentication by updating the session.
func CompleteAuthentication(ctx contractapi.TransactionContextInterface, sessionID, sharedSecret string) error {
	sessionJSON, err := ctx.GetStub().GetState(sessionID)
	if err != nil {
		return fmt.Errorf("failed to get session: %v", err)
	}
	if sessionJSON == nil {
		return fmt.Errorf("session not found")
	}
	var session AuthSession
	if err := json.Unmarshal(sessionJSON, &session); err != nil {
		return fmt.Errorf("failed to unmarshal session: %v", err)
	}
	// In a real implementation, the sharedSecret would further secure the session.
	session.IsAuthenticated = true
	updatedSessionJSON, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal updated session: %v", err)
	}
	return ctx.GetStub().PutState(sessionID, updatedSessionJSON)
}

// GetUser retrieves a user from the ledger.
func GetUser(ctx contractapi.TransactionContextInterface, userID string) (*User, error) {
	userKey := fmt.Sprintf("user:%s", userID)
	userJSON, err := ctx.GetStub().GetState(userKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %v", err)
	}
	if userJSON == nil {
		return nil, fmt.Errorf("user not found")
	}
	var user User
	if err := json.Unmarshal(userJSON, &user); err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %v", err)
	}
	return &user, nil
}

// AuthSession wraps the models.Session to include MCC-specific fields if needed.
type AuthSession struct {
	models.Session
}
