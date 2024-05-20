#!/bin/bash
cat > /tmp/user-data.sh << EOF
echo "Setting up NodeJS Environment"
curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

echo 'export NVM_DIR="/home/ubuntu/.nvm"' >> /home/ubuntu/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm' >> /home/ubuntu/.bashrc

echo "source the files to ensure that variables are available within the current shell"
. /home/ubuntu/.nvm/nvm.sh
. /home/ubuntu/.bashrc

echo "Installing NVM, NPM, Node.JS"
nvm alias default v20
nvm install v20
nvm use v20

echo "Installing yarn"
curl -o- -L https://yarnpkg.com/install.sh | bash
export PATH="$HOME/.yarn/bin:$HOME/.config/yarn/global/node_modules/.bin:$PATH" 

echo "Installing mongodb"
sudo apt dist-upgrade -y && sudo apt-get install gnupg -y
wget -qO - https://pgp.mongodb.com/server-6.0.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/mongodb-6.0.gpg
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update && sudo apt-get install -y mongodb-org && sudo systemctl enable mongod && sudo systemctl start mongod
sudo sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf
sudo systemctl restart mongod

echo "Installing codedeploy-agent"
sudo apt update && sudo apt upgrade -y
sudo apt-get install -y ruby
cd /home/ubuntu
wget https://aws-codedeploy-ap-south-1.s3.ap-south-1.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo systemctl start codedeploy-agent
sudo systemctl enable codedeploy-agent
EOF

chown ubuntu:ubuntu /tmp/user-data.sh && chmod a+x /tmp/user-data.sh
sleep 1; su - ubuntu -c "/tmp/user-data.sh"