#!/usr/bin/env node

/* Pick server and start connection with VPNGate (http://www.vpngate.net/en/) */

const request = require('request');
const { execFileSync } = require('child_process');
const { tmpNameSync } = require('tmp');
const fs = require('fs');

// Required configuration
const server = 'http://www.vpngate.net/api/iphone/'
const country = process.argv[2];
const command = process.argv[1]

if (process.argv.length !== 3) {
  console.log(`usage: ${command} [country name | country code]`);
  process.exit(1);
}

let search_country;
if (country.length === 2) {
  search_country = 6; // short name for country
} else if (country.length > 2) {
  search_country = 5; // long name for country
} else {
  console.log('Country is too short!');
  process.exit(1);
}

request.get(server, async (error, response, body) => {
  if (error || response.statusCode !== 200) {
    console.log('Cannot get VPN servers data');
    process.exit(1);
  }

  const vpn_data = body.replace(/\r/g, '');
  const servers = vpn_data.split('\n').map(line => line.split(','));
  const labels = servers[1];
  labels[0] = labels[0].substring(1);
  const filteredServers = servers.filter(s => s.length > 1);
  const desired = filteredServers.filter(s => s[search_country].toLowerCase().includes(country.toLowerCase()));
  const found = desired.length;
  console.log(`Found ${found} servers for country ${country}`);
  if (found === 0) {
    process.exit(1);
  }

  const supported = desired.filter(s => s[s.length - 1].length > 0);
  console.log(`${supported.length} of these servers support OpenVPN`);
  // We pick the best servers by score
  const winner = supported.sort((a, b) => parseFloat(b[2].replace(',', '.')) - parseFloat(a[2].replace(',', '.')))[0];

  console.log("\n== Best server ==");
  const pairs = labels.slice(0, -1).map((l, index) => [l, winner[index]]);
  for (const [l, d] of pairs.slice(0, 4)) {
    console.log(`${l}: ${d}`);
  }
  console.log(`${pairs[4][0]}: ${parseFloat(pairs[4][1]) / 10 ** 6} MBps`);
  console.log(`Country: ${pairs[5][1]}`);

  console.log("\nLaunching VPN...");
  const path = tmpNameSync();
  fs.writeFileSync(path, Buffer.from(winner[winner.length - 1], 'base64'));
  fs.appendFileSync(path, '\nscript-security 2\nup /etc/openvpn/update-resolv-conf\ndown /etc/openvpn/update-resolv-conf');

  const child = execFileSync('sudo', ['openvpn', '--config', path], { stdio: 'ignore', detached: true });
  try {
    while (true) {
      // sleep for 10 minutes
      await new Promise(resolve => setTimeout(resolve, 600000));
    }
  } catch {
    try {
      child.kill();
    } catch {
      // do nothing
    }
    while (child.status === null) {
      // wait for the child process to exit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\nVPN terminated');
  }
});