const { Client } = require('ssh2');
const conn = new Client();

console.log('Connecting to VPS...');

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(`cd /root/Vajrascan.on && git pull origin main && npm install && npm run build && pm2 restart all`, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      process.stderr.write('STDERR: ' + data);
    });
  });
}).connect({
  host: '157.245.100.131',
  port: 22,
  username: 'root',
  password: 'ShaktiMan@123Q',
  readyTimeout: 10000
});
