const winston = require('winston')
const cfg = require('./config')

export = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: cfg.log.level.toLowerCase()
    })
  ]
})