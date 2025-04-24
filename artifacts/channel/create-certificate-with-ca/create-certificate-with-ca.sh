# createcertificatesForBLR() {
  # echo
  # echo "Enroll the CA admin"
  # echo
  mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/
  export FABRIC_CA_CLIENT_HOME=${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/

   
 fabric-ca-client enroll -u https://admin:adminpw@localhost:7054 --caname ca.blr.pesuhospital.com --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem
   
 
  # echo 'NodeOUs:
  # Enable: true
  # ClientOUIdentifier:
  #   Certificate: cacerts/localhost-7054-ca-blr-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: client
  # PeerOUIdentifier:
  #   Certificate: cacerts/localhost-7054-ca-blr-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: peer
  # AdminOUIdentifier:
  #   Certificate: cacerts/localhost-7054-ca-blr-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: admin
  # OrdererOUIdentifier:
  #   Certificate: cacerts/localhost-7054-ca-blr-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: orderer' >${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/msp/config.yaml

  # echo
  # echo "Register peer0"
  # echo
  # fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  # echo
  # echo "Register peer1"
  # echo
  # fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Register user"
  echo
  fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name user1 --id.secret user1pw --id.type client --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Register doctor"
  echo
  fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name doctor1 --id.secret doctorpw --id.type client --id.attrs "hf.Registrar.Roles=client,role=doctor:ecert" --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Register patient"
  echo
  fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name patient1 --id.secret patientpw --id.type client --id.attrs "hf.Registrar.Roles=client,role=patient:ecert" --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Register receptionist"
  echo
  fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name receptionist1 --id.secret receppw --id.type client --id.attrs "hf.Registrar.Roles=client,role=receptionist:ecert" --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Register pharmacist"
  echo
  fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name pharmacist1 --id.secret pharmpw --id.type client --id.attrs "hf.Registrar.Roles=client,role=pharmacist:ecert" --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem


  # echo
  # echo "Register the org admin"
  # echo
  # fabric-ca-client register --caname ca.blr.pesuhospital.com --id.name blradmin --id.secret blradminpw --id.type admin --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

# #   mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers

# #   # -----------------------------------------------------------------------------------
# #   #  Peer 0
    # mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com

  # echo
  # echo "## Generate the peer0 msp"
  # echo
  # fabric-ca-client enroll -u https://peer0:peer0pw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/msp --csr.hosts peer0.blr.pesuhospital.com --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the peer0-tls certificates"
  # echo
  # fabric-ca-client enroll -u https://peer0:peer0pw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls --enrollment.profile tls --csr.hosts peer0.blr.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/server.key

  # mkdir ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/msp/tlscacerts
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/msp/tlscacerts/ca.crt

  # mkdir ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/tlsca
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/tlsca/tlsca.blr.pesuhospital.com-cert.pem

  # mkdir ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/ca
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer0.blr.pesuhospital.com/msp/cacerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/ca/ca.blr.pesuhospital.com-cert.pem

#   # ------------------------------------------------------------------------------------------------

#   # Peer1

  # mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com

  # echo
  # echo "## Generate the peer1 msp"
  # echo
  # fabric-ca-client enroll -u https://peer1:peer1pw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/msp --csr.hosts peer1.blr.pesuhospital.com --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the peer1-tls certificates"
  # echo
  # fabric-ca-client enroll -u https://peer1:peer1pw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls --enrollment.profile tls --csr.hosts peer1.blr.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/peers/peer1.blr.pesuhospital.com/tls/server.key

# #   # --------------------------------------------------------------------------------------------------

  # mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users
  # mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/User1@blr.pesuhospital.com

  # echo
  # echo "## Generate the user msp"
  # echo
  # fabric-ca-client enroll -u https://user1:user1pw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/User1@blr.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Enroll doctor"
  echo
  mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Doctor@blr.pesuhospital.com
  fabric-ca-client enroll -u https://doctor1:doctorpw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Doctor@blr.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Enroll patient"
  echo
  mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Patient@blr.pesuhospital.com
  fabric-ca-client enroll -u https://patient1:patientpw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Patient@blr.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Enroll pharmacist"
  echo
  mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Pharmacist@blr.pesuhospital.com
  fabric-ca-client enroll -u https://pharmacist1:pharmpw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Pharmacist@blr.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

  echo
  echo "Enroll receptionist"
  echo
  mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Receptionist@blr.pesuhospital.com
  fabric-ca-client enroll -u https://receptionist1:receppw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Receptionist@blr.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem


  # mkdir -p crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Admin@blr.pesuhospital.com

  # echo
  # echo "## Generate the org admin msp"
  # echo
  # fabric-ca-client enroll -u https://blradmin:blradminpw@localhost:7054 --caname ca.blr.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Admin@blr.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/blr/tls-cert.pem

#  cp ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/peerOrganizations/blr.pesuhospital.com/users/Admin@blr.pesuhospital.com/msp/config.yaml

# }

# createcertificatesForBLR

# createCertificateForKPM() {
  # echo
  # echo "Enroll the CA admin"
  # echo
  # mkdir -p /crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/

#  export FABRIC_CA_CLIENT_HOME=${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/

   
# fabric-ca-client enroll -u https://admin:adminpw@localhost:8054 --caname ca.kpm.pesuhospital.com --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # echo 'NodeOUs:
  # Enable: true
  # ClientOUIdentifier:
  #   Certificate: cacerts/localhost-8054-ca-kpm-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: client
  # PeerOUIdentifier:
  #   Certificate: cacerts/localhost-8054-ca-kpm-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: peer
  # AdminOUIdentifier:
  #   Certificate: cacerts/localhost-8054-ca-kpm-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: admin
  # OrdererOUIdentifier:
  #   Certificate: cacerts/localhost-8054-ca-kpm-pesuhospital-com.pem
  #   OrganizationalUnitIdentifier: orderer' >${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/msp/config.yaml

  # echo
  # echo "Register peer0"
  # echo
   
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # echo
  # echo "Register peer1"
  # echo
   
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name peer1 --id.secret peer1pw --id.type peer --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # echo
  # echo "Register user"
  # echo
   
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name user2 --id.secret user2pw --id.type client --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Register doctor"
  # echo
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name doctor2 --id.secret doctorpw --id.type client --id.attrs "hf.Registrar.Roles=client,role=doctor:ecert" --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Register patient"
  # echo
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name patient2 --id.secret patientpw --id.type client --id.attrs "hf.Registrar.Roles=client,role=patient:ecert" --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Register receptionist"
  # echo
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name receptionist2 --id.secret receppw --id.type client --id.attrs "hf.Registrar.Roles=client,role=receptionist:ecert" --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Register pharmacist"
  # echo
  # fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name pharmacist2 --id.secret pharmpw --id.type client --id.attrs "hf.Registrar.Roles=client,role=pharmacist:ecert" --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

#   echo
#   echo "Register the org admin"
#   echo
#  fabric-ca-client register --caname ca.kpm.pesuhospital.com --id.name kpmadmin --id.secret kpmadminpw --id.type admin --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

#   # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers
# mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com

# #   # --------------------------------------------------------------
# #   # Peer 0
  # echo
  # echo "## Generate the peer0 msp"
  # echo
   
  # fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/msp --csr.hosts peer0.kpm.pesuhospital.com --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the peer0-tls certificates"
  # echo
   
  # fabric-ca-client enroll -u https://peer0:peer0pw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls --enrollment.profile tls --csr.hosts peer0.kpm.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/server.key

  # mkdir ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/msp/tlscacerts
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/msp/tlscacerts/ca.crt

  # mkdir ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/tlsca
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/tlsca/tlsca.kpm.pesuhospital.com-cert.pem

  # mkdir ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/ca
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer0.kpm.pesuhospital.com/msp/cacerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/ca/ca.kpm.pesuhospital.com-cert.pem

  
#   # --------------------------------------------------------------------------------
#   #  Peer 1
  # echo
  # echo "## Generate the peer1 msp"
  # echo
   
  # fabric-ca-client enroll -u https://peer1:peer1pw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/msp --csr.hosts peer1.kpm.pesuhospital.com --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the peer1-tls certificates"
  # echo
   
  # fabric-ca-client enroll -u https://peer1:peer1pw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls --enrollment.profile tls --csr.hosts peer1.kpm.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/peers/peer1.kpm.pesuhospital.com/tls/server.key
#   # -----------------------------------------------------------------------------------

  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users
  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/User2@kpm.pesuhospital.com

  # echo
  # echo "## Generate the user msp"
  # echo
   
  # fabric-ca-client enroll -u https://user2:user2pw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/User2@kpm.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Enroll doctor"
  # echo
  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Doctor@kpm.pesuhospital.com
  # fabric-ca-client enroll -u https://doctor2:doctorpw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Doctor@kpm.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Enroll patient"
  # echo
  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Patient@kpm.pesuhospital.com
  # fabric-ca-client enroll -u https://patient2:patientpw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Patient@kpm.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Enroll pharmacist"
  # echo
  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Pharmacist@kpm.pesuhospital.com
  # fabric-ca-client enroll -u https://pharmacist2:pharmpw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Pharmacist@kpm.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

  # echo
  # echo "Enroll receptionist"
  # echo
  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Receptionist@kpm.pesuhospital.com
  # fabric-ca-client enroll -u https://receptionist2:receppw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Receptionist@kpm.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem

   

  # mkdir -p crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Admin@kpm.pesuhospital.com

  # echo
  # echo "## Generate the org admin msp"
  # echo
   
  # fabric-ca-client enroll -u https://kpmadmin:kpmadminpw@localhost:8054 --caname ca.kpm.pesuhospital.com -M ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Admin@kpm.pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/kpm/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/peerOrganizations/kpm.pesuhospital.com/users/Admin@kpm.pesuhospital.com/msp/config.yaml

# }

# createCertificateForKPM

createCretificateForOrderer() {
  # echo
  # echo "Enroll the CA admin"
  # echo
  # mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com

#  export FABRIC_CA_CLIENT_HOME=${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com

   
# fabric-ca-client enroll -u https://admin:adminpw@localhost:9054 --caname ca-orderer --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # echo 'NodeOUs:
  # Enable: true
  # ClientOUIdentifier:
  #   Certificate: cacerts/localhost-9054-ca-orderer.pem
  #   OrganizationalUnitIdentifier: client
  # PeerOUIdentifier:
  #   Certificate: cacerts/localhost-9054-ca-orderer.pem
  #   OrganizationalUnitIdentifier: peer
  # AdminOUIdentifier:
  #   Certificate: cacerts/localhost-9054-ca-orderer.pem
  #   OrganizationalUnitIdentifier: admin
  # OrdererOUIdentifier:
  #   Certificate: cacerts/localhost-9054-ca-orderer.pem
  #   OrganizationalUnitIdentifier: orderer' >${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/config.yaml

  # echo
  # echo "Register orderer"
  # echo
   
  # fabric-ca-client register --caname ca-orderer --id.name orderer --id.secret ordererpw --id.type orderer --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # echo
  # echo "Register orderer2"
  # echo
   
  # fabric-ca-client register --caname ca-orderer --id.name orderer2 --id.secret ordererpw --id.type orderer --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # echo
  # echo "Register orderer3"
  # echo
   
  # fabric-ca-client register --caname ca-orderer --id.name orderer3 --id.secret ordererpw --id.type orderer --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

#   echo
#   echo "Register the orderer admin"
#   echo
   
# fabric-ca-client register --caname ca-orderer --id.name ordererAdmin --id.secret ordererAdminpw --id.type admin --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

#   mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers
#   # mkdir -p crypto-config-ca/ordererOrganizations/example.com/orderers/example.com

#   # ---------------------------------------------------------------------------
#   #  Orderer

# mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com

  # echo
  # echo "## Generate the orderer msp"
  # echo
   
  # fabric-ca-client enroll -u https://orderer:ordererpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp --csr.hosts orderer.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  #  cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the orderer-tls certificates"
  # echo
   
  # fabric-ca-client enroll -u https://orderer:ordererpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls --enrollment.profile tls --csr.hosts orderer.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/server.key

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/tlscacerts
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/tlscacerts/tlsca.pesuhospital.com-cert.pem

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/tlsca
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/tlsca/tlsca.blr.pesuhospital.com-cert.pem


  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/ca
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/cacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/ca/ca.pesuhospital.com-cert.pem

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/tlscacerts
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/tlscacerts/tlsca.pesuhospital.com-cert.pem
#   # -----------------------------------------------------------------------
#   #  Orderer 2

  # mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com

  # echo
  # echo "## Generate the orderer msp"
  # echo
   
  # fabric-ca-client enroll -u https://orderer2:ordererpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/msp --csr.hosts orderer2.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the orderer-tls certificates"
  # echo
   
  # fabric-ca-client enroll -u https://orderer2:ordererpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls --enrollment.profile tls --csr.hosts orderer2.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/server.key

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/msp/tlscacerts
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer2.pesuhospital.com/msp/tlscacerts/tlsca.pesuhospital.com-cert.pem

#   # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/example.com/msp/tlscacerts
#   # cp ${PWD}/crypto-config-ca/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem

#   # ---------------------------------------------------------------------------
#   #  Orderer 3
  # mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com

  # echo
  # echo "## Generate the orderer msp"
  # echo
   
  # fabric-ca-client enroll -u https://orderer3:ordererpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/msp --csr.hosts orderer3.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/msp/config.yaml

  # echo
  # echo "## Generate the orderer-tls certificates"
  # echo
   
  # fabric-ca-client enroll -u https://orderer3:ordererpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls --enrollment.profile tls --csr.hosts orderer3.pesuhospital.com --csr.hosts localhost --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/ca.crt
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/signcerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/server.crt
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/keystore/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/server.key

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/msp/tlscacerts
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer3.pesuhospital.com/msp/tlscacerts/tlsca.pesuhospital.com-cert.pem

# #   # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/example.com/msp/tlscacerts
# #   # cp ${PWD}/crypto-config-ca/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# #   # ---------------------------------------------------------------------------

#   mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com/users
  # mkdir -p crypto-config-ca/ordererOrganizations/pesuhospital.com/users/Admin@pesuhospital.com

  # echo
  # echo "## Generate the admin msp"
  # echo
   
  # fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:9054 --caname ca-orderer -M ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/users/Admin@pesuhospital.com/msp --tls.certfiles ${PWD}/fabric-ca/ordererOrg/tls-cert.pem
   

  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/msp/config.yaml ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/users/Admin@pesuhospital.com/msp/config.yaml

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/ca
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/msp/cacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/ca/ca.pesuhospital.com-cert.pem

  # mkdir ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/tlsca
  # cp ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/orderers/orderer.pesuhospital.com/tls/tlscacerts/* ${PWD}/crypto-config-ca/ordererOrganizations/pesuhospital.com/tlsca/tlsca.pesuhospital.com-cert.pem


}

createCretificateForOrderer

# sudo rm -rf crypto-config-ca/*
# # sudo rm -rf fabric-ca/*
# createcertificatesForBLR
# createCertificateForKPM
# createCretificateForOrderer

