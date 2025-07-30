

const axios = require('axios');

async function Log(stack, level, pkg, message) {
    try {
        await axios.post('http://20.244.56.144/evaluation-service/logs', {
            stack,
            level,
            package: pkg,
            message
        });
    } catch (err) {
        
    }
}


function loggingMiddleware(req, res, next) {
    Log("backend", "info", "middleware", `${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
}

module.exports = { Log, loggingMiddleware };
