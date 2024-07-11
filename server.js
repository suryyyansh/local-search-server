var { Readability } = require('@mozilla/readability');
var { JSDOM } = require('jsdom');  
var https = require('node:https');

// Import the express module
const express = require('express');

// Create an instance of express
const app = express();

app.use(express.json());

// Define the port
const port = 3000;

let defaultLogLevel = "debug"

// Define a route handler for the root URL
app.post('/search', (req, res) => {
  const body = req.body
  const term = body.term;
  const engine = body.engine;
  const maxSearchResults = body.maxSearchResults ? body.maxSearchResults : 5;
  var engineSearchUrl;

  switch(engine) {
    case "google":
      engineSearchUrl = "https://google.com/search?q=" + encodeURIComponent(term);
      break;
    case "bing":
      engineSearchUrl = "https://bing.com/search?q=" + encodeURIComponent(term);
      break;
  }

  console.log("info", engineSearchUrl);

  var get_follow_redirects = (url) => {
    https.get(url, (httpsRes) => {

      if(httpsRes.statusCode >= 300 && httpsRes.statusCode < 400) {
        log("debug", `following a redirect to: ${url}`);
        get_follow_redirects(httpsRes.headers.location);
      } else {
        let data = '';

        // a chunk of data has been received.
        httpsRes.on('data', (chunk) => {
          data += chunk;
        });
        // the whole response has been received. print out the result.
        httpsRes.on('end', () => {
          
          var doc = new JSDOM(data, {
            url: url,
            runScripts: 'dangerously'
          });
          
          doc.window.addEventListener('DOMContentLoaded', () => {
              doc.window.addEventListener('load', () => {
          
              let resultUrls = doc.window.document.querySelectorAll('h3');
              let i = 0;

              let parsedSiteList = [];

              for (x of resultUrls) {
                let currentNodeHref = x.closest('a').getAttribute('href') 
                
                if(!currentNodeHref) continue;
                if (i++ > maxSearchResults) break;
                
                let refinedCurrentNodeHref = decodeURIComponent(
                  currentNodeHref.substring(7, currentNodeHref.indexOf("&sa")))
                
                log("info", refinedCurrentNodeHref);
                parseWithReadability(refinedCurrentNodeHref).then((article) => {
                  parsedSiteList.push(article);
                });
              }
              console.log(parsedSiteList);
                //res.send({ parsedSiteList });
            });
          });
        });
      }
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      //return "FAILED TO ACCESS SEARCH ENGINE";
    });
  }
  get_follow_redirects(engineSearchUrl);

  res.send("query excecuted\n");
  return;
});

// https://www.30secondsofcode.org/js/s/color-console-output/

const logLevels = (...msg) => {
  const levels = {
    info: `\x1b[37m${msg.join(' ')}`,
    infoMarker: `\x1b[30m\x1b[47m[INFO]\x1b[0m`,
    error: `\x1b[31m${msg.join(' ')}\x1b[37m`,
    errorMarker: `\x1b[41m[ERROR]\x1b[0m`,
    debug: `\x1b[32m${msg.join(' ')}\x1b[37m`,
    debugMarker: `\x1b[30m\x1b[42m[DEBUG]\x1b[0m`,
  };
  return (style) => levels[style];
};

function log(logLevel=defaultLogLevel, ...msg) {
  console.log(logLevels()(logLevel + 'Marker') + " " + logLevels(msg)(logLevel))
}

async function parseWithReadability(url) {
  log("info", `parsing with readability: ${url}`)
  JSDOM.fromURL(url).then((doc) => {
    let article = new Readability(doc.window.document).parse();

    log("info", `article parsed, text: ${article.excerpt.slice(0, 300)}`)
    return { siteName: article.siteName, url: url, textContent: article.textContent};
  })
}

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`); // Log server start info
});

