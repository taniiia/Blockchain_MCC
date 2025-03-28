
# chmod -R 0755 ./crypto-config
# # Delete existing artifacts
# rm -rf ./crypto-config
# rm genesis.block mychannel.tx
# rm -rf ../../channel-artifacts/*

#Generate Crypto artifactes for organizations
#cryptogen generate --config=./crypto-config.yaml --output=./crypto-config/



# System channel
SYS_CHANNEL="sys-channel"
REG_CHANNEL="registration-channel"
PM_CHANNEL="patient-medication-channel"
BILL_CHANNEL="billing-channel"
COMM_CHANNEL="communication-channel"



# # Generate System Genesis block
#echo "Generating genesis block for system channel ($SYS_CHANNEL)..."
#configtxgen -profile OrdererGenesis -configPath . -channelID $SYS_CHANNEL  -outputBlock ./genesis.block

#Generate channel config for each channel
# configtxgen -profile RegistrationChannel -configPath . -outputCreateChannelTx ./registration-channel.tx -channelID $REG_CHANNEL

# configtxgen -profile PatientMedicationChannel -configPath . -outputCreateChannelTx ./patient-medication-channel.tx -channelID $PM_CHANNEL

# configtxgen -profile BillingChannel -configPath . -outputCreateChannelTx ./billing-channel.tx -channelID $BILL_CHANNEL

# configtxgen -profile CommunicationChannel -configPath . -outputCreateChannelTx ./communication-channel.tx -channelID $COMM_CHANNEL

# echo "#######    Generating anchor peer update for PESUHospitalBLRMSP  ##########"
# configtxgen -profile RegistrationChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalBLRMSPanchors_registration.tx -channelID $REG_CHANNEL -asOrg PESUHospitalBLRMSP

# configtxgen -profile PatientMedicationChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalBLRMSPanchors_patient_medication.tx -channelID $PM_CHANNEL -asOrg PESUHospitalBLRMSP

# configtxgen -profile BillingChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalBLRMSPanchors_billing.tx -channelID $BILL_CHANNEL -asOrg PESUHospitalBLRMSP

# configtxgen -profile CommunicationChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalBLRMSPanchors_communication.tx -channelID $COMM_CHANNEL -asOrg PESUHospitalBLRMSP

# echo "#######    Generating anchor peer update for PESUHospitalKPMMSP  ##########"
# configtxgen -profile RegistrationChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalKPMMSPanchors_registration.tx -channelID $REG_CHANNEL -asOrg PESUHospitalKPMMSP

# configtxgen -profile PatientMedicationChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalKPMMSPanchors_patient_medication.tx -channelID $PM_CHANNEL -asOrg PESUHospitalKPMMSP

# configtxgen -profile BillingChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalKPMMSPanchors_billing.tx -channelID $BILL_CHANNEL -asOrg PESUHospitalKPMMSP

# configtxgen -profile CommunicationChannel -configPath . -outputAnchorPeersUpdate ./PESUHospitalKPMMSPanchors_communication.tx -channelID $COMM_CHANNEL -asOrg PESUHospitalKPMMSP
