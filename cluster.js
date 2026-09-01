const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`[Master] Primary process ${process.pid} is booting up...`);
    console.log(`[Master] Forking workers across ${numCPUs} CPU cores for top-grossing scale performance.`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`[Master] Worker ${worker.process.pid} died. Spin up replacement...`);
        cluster.fork();
    });
} else {
    require('./server.js');
}
