# NodeVPN
This Node.js script is a reimplementation of an unmaintained Python script that enables users to easily connect to VPNGate's free VPN service. The script prompts the user to specify their desired output country, and automatically selects the best server for that location. With this script, users can easily connect to VPNGate's VPN service without needing to manually configure any settings or choose a server.

### Installation
```
npm install
```

### Run the service using country code or country names
```
sudo node serve.js US # or sudo node serve.js "United States"
```
### Demo
![Connection image](demo.png "")

### Disconnect from the server
```
sudo killall openvpn
```

