require('dotenv').config();
const express = require('express');
const session = require('express-session');
const http = require('http');
const cron = require('node-cron');
const opn = require('open');
const app = express();
const axios = require('axios');

const { renderView } = require('./views/test.view');
const port = process.env.PORT || 3000;

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
  throw new Error('Missing CLIENT_ID or CLIENT_SECRET environment variable.');
}

// Use a session to keep track of client ID
app.use(
  session({
    secret: Math.random().toString(36).substring(2),
    resave: false,
    saveUninitialized: true,
  })
);

app.get('/', renderView);

app.get('/error', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end();
});

app.listen(port, () => console.log(`=== Starting your app on http://localhost:${port} ===`));

opn(`http://localhost:${port}`);

// setInterval(function () {
//   http.get('https://pca-integration.herokuapp.com/');
//   console.log('Made an http call');
// }, 300000); // every 5 minutes (300000)

cron.schedule('*/5 * * * *', async () => {
  const data = await axios.get('https://pca-services.herokuapp.com/');
  console.log(data);
});
