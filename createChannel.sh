export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${PWD}/artifacts/channel/crypto-config/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/tlscacerts/tlsca.pesuhospital.com-cert.pem
export PEER0_PESUHOSPITALBLR_CA=${PWD}/artifacts/channel/crypto-config/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/ca.crt
export PEER0_PESUHOSPITALKPM_CA=${PWD}/artifacts/channel/crypto-config/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/ca.crt
export FABRIC_CFG_PATH=${PWD}/artifacts/channel/config

export CHANNEL_NAME=patient-medication-channel

setGlobalsForOrderer(){
    export CORE_PEER_LOCALMSPID="OrdererMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/artifacts/channel/crypto-config/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/tlscacerts/tlsca.pesuhospital.com-cert.pem
    export CORE_PEER_MSPCONFIGPATH=${PWD}/artifacts/channel/crypto-config/ordererOrganizations/pesuhospital.com/users/Admin@pesuhospital.com/msp
}

setGlobalsForPeer0BLR(){
    export CORE_PEER_LOCALMSPID="PESUHospitalBLRMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_PESUHOSPITALBLR_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/artifacts/channel/crypto-config/peerOrganizations/blr.pesuhospital.com/users/Admin@blr.pesuhospital.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
}

setGlobalsForPeer1BLR(){
    export CORE_PEER_LOCALMSPID="PESUHospitalBLRMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_PESUHOSPITALBLR_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/artifacts/channel/crypto-config/peerOrganizations/blr.pesuhospital.com/users/Admin@blr.pesuhospital.com/msp
    export CORE_PEER_ADDRESS=localhost:8051
}

setGlobalsForPeer0KPM(){
    export CORE_PEER_LOCALMSPID="PESUHospitalKPMMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_PESUHOSPITALKPM_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/artifacts/channel/crypto-config/peerOrganizations/kpm.pesuhospital.com/users/Admin@kpm.pesuhospital.com/msp
    export CORE_PEER_ADDRESS=localhost:9051
}

setGlobalsForPeer1KPM(){
    export CORE_PEER_LOCALMSPID="PESUHospitalKPMMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_PESUHOSPITALKPM_CA
    export CORE_PEER_MSPCONFIGPATH=${PWD}/artifacts/channel/crypto-config/peerOrganizations/kpm.pesuhospital.com/users/Admin@kpm.pesuhospital.com/msp
    export CORE_PEER_ADDRESS=localhost:10051
}

createChannel(){
    #rm -rf ./channel-artifacts/*

    echo "Creating channel '$CHANNEL_NAME'..." 
    setGlobalsForPeer0BLR
    
    peer channel create -o localhost:7050 -c $CHANNEL_NAME \
    --ordererTLSHostnameOverride orderer.pesuhospital.com \
    -f ./artifacts/channel/${CHANNEL_NAME}.tx --outputBlock ./channel-artifacts/${CHANNEL_NAME}.block \
    --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA
}

removeOldCrypto(){
    rm -rf ./api-1.4/crypto/*
    rm -rf ./api-1.4/fabric-client-kv-blr/*
    rm -rf ./api-2.0/org1-wallet/*
    rm -rf ./api-2.0/org2-wallet/*
}


joinChannel(){
    setGlobalsForPeer0BLR
    peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block
    
    setGlobalsForPeer1BLR
    peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block
    
    setGlobalsForPeer0KPM
    peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block
    
    setGlobalsForPeer1KPM
    peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block
    
}

updateAnchorPeers(){
    setGlobalsForPeer0BLR
    peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.pesuhospital.com -c $CHANNEL_NAME -f ./artifacts/channel/${CORE_PEER_LOCALMSPID}anchors_patient_medication.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA
    
    setGlobalsForPeer0KPM
    peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.pesuhospital.com -c $CHANNEL_NAME -f ./artifacts/channel/${CORE_PEER_LOCALMSPID}anchors_patient_medication.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA
    
}

#removeOldCrypto

#createChannel
#joinChannel
#updateAnchorPeers