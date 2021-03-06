require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const winston = require('winston');

const { NODE_ENV } = require('./config')
const BookmarksService = require('./bookmark/bookmarks-service')
const bookmarksRouter = require('./bookmark/bookmark-router')
const { get } = require('./bookmark/bookmark-router')
const app = express()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'info.log' })
  ]
});

if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

app.use(function validationBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN
  const authToken = req.get('Authorization')

  if (!authToken || authToken.split(' ')[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized request' })
  }
  next()
})

app.use(morgan(morganOption))
app.use(helmet())
app.use(cors())

app.get('/bookmarks', (req, res, next) => {
  const knexInstance = req.app.get('db')
  BookmarksService.getAllBookmarks(knexInstance)
    .then(bookmarks => {
      res.json(bookmarks)
    })
    .catch(next)
})

app.get('/bookmarks/:bookmark_id', (req, res, next) => {
  BookmarksService.getById(
    req.app.get('db'),
    req.params.bookmark_id
  )
    .then(bookmarks => {
      res.json({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        description: bookmarks.description,
        rating: bookmarks.rating
      })
    })
})
app.get('/', (req, res) => {
  res.send('Hello, world!')
})

app.use(function errorHandler(error, req, res, next) {
  let response
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } }
  } else {
    console.log(error)
    response = { message: error.message, error }
  }
  res.status(500).json(response)
})

app.use(bookmarksRouter)

module.exports = app
