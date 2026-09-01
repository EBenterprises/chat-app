const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    console.log(`[Enterprise Master] Initializing Primary Controller (${process.pid})`);
    console.log(`[Enterprise Master] Allocating worker pool across ${numCPUs} physical CPU cores.`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.warn(`[Enterprise Master] Worker node ${worker.process.pid} exited. Provisioning hot replacement...`);
        cluster.fork();
    });

    process.on('SIGTERM', () => {
        console.log('[Enterprise Master] Terminating worker pool gracefully...');
        for (const id in cluster.workers) {
            cluster.workers[id].send('shutdown');
        }
        setTimeout(() => process.exit(0), 5000);
    });
} else {
    require('./server.js');
}
