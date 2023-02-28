const request = require('request');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const [,command,country] = process.argv;
const api_server = 'http://www.vpngate.net/api/iphone/';

const launchVPN(country) => {
  const country_length = country.length === 2 ? 6 : 5;

  request(api_server, (error, response, body) => {
    if (error) {
      console.error('Cannot get VPN servers data');
      process.exit(1);
    }

    const vpn_data = body.replace(/\r/g, '');
    const servers = vpn_data.split('\n').map((line) => line.split(','));
    const labels = servers[1].map((label) => label.slice(1));
    servers.splice(0, 2);

    const desired = servers.filter((s) => s.length > 1 && s[country_length].toLowerCase().includes(country.toLowerCase()));
    const found = desired.length;

    console.log(`Found ${found} servers for country ${country}`);

    if (found === 0) {
      process.exit(1);
    }

    const supported = desired.filter((s) => s[s.length - 1].length > 0);
    console.log(`${supported.length} of these servers support OpenVPN`);

    const winner = supported.sort((a, b) => parseFloat(b[2].replace(',', '.')) - parseFloat(a[2].replace(',', '.')))[0];

    console.log('\n== Best server ==');

    const pairs = labels.slice(0, -1).map((l, i) => `${l}: ${winner[i]}`);
    pairs.push(`${labels[4]}: ${parseFloat(winner[4]) / 10 ** 6} MBps`);
    pairs.push(`Country: ${winner[5]}`);

    console.log(pairs.join('\n'));

    console.log('\nLaunching VPN...');

    const path = `${os.tmpdir()}/openvpn.conf`;
    const content = Buffer.from(winner[winner.length - 1], 'base64').toString('ascii');
    const lines = content.split('\n');
    lines.splice(1, 0, 'script-security 2');
    lines.splice(2, 0, 'up /etc/openvpn/update-resolv-conf');
    lines.splice(3, 0, 'down /etc/openvpn/update-resolv-conf');
    const finalContent = lines.join('\n');
    fs.writeFileSync(path, finalContent);

    const child = spawn('sudo', ['openvpn', '--config', path], { stdio: 'inherit' });

    const handler = () => {
      try {
        child.kill();
      } catch (err) {}
      while (child.exitCode === null) {
        // wait for child process to exit
      }
      console.log('\nVPN terminated');
      process.exit();
    };

    process.on('SIGINT', handler);
    process.on('SIGTERM', handler);
  });
}


if (!country) {
  console.error(`usage: node ${command}.js [country name | country code]`);
  process.exit(1);
}

launchVPN(country);
