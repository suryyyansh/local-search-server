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

  var searchHandlerGoogle = (url) => {
    https.get(url, (httpsRes) => {

      // handling location based redirects
      if(httpsRes.statusCode >= 300 && httpsRes.statusCode < 400) {
        
        log("debug", `following a redirect to: ${url}`);
        searchHandlerGoogle(httpsRes.headers.location);

      } else {

        let chunks = '';

        // a chunk of data has been received.
        httpsRes.on('data', (chunk) => {
          chunks += chunk;
        });

        // the whole response has been received. print out the result.
        httpsRes.on('end', () => {
          
          var doc = new JSDOM(chunks);
          
          doc.window.addEventListener('DOMContentLoaded', () => {
            doc.window.addEventListener('load', () => {
              
              let resultUrls = doc.window.document.querySelectorAll('h3');
              let i = 0;
              let promises = [];

              for (x of resultUrls) {
                if(!x.closest('a') || !x.closest('a').getAttribute('href')) continue;
                let currentNodeHref = x.closest('a').getAttribute('href') 
                if (i++ >= maxSearchResults) break;
                
                let refinedCurrentNodeHref = decodeURIComponent(
                  currentNodeHref.substring(7, currentNodeHref.indexOf("&sa")))
                
                log("debug", `current node being processed: ${refinedCurrentNodeHref}`);
                promises.push(parseWithReadability(refinedCurrentNodeHref));
              }

              Promise.all(promises).then(parsedSiteList => {
                res.send(parsedSiteList);
                log("info", "Query responded")
              });
            });
          });
        });
      }

    }).on('error', (e) => {
      log("error", `Got error: ${e.message}`);
      res.send(`{"error": "failed to access search engine."}`);
    });
  }

  // add new engines here.
  switch(engine) {
    case "google":
      engineSearchUrl = "https://google.com/search?q=" + encodeURIComponent(term);
      searchHandlerGoogle(engineSearchUrl);
      break;
    //case "bing":
    //  engineSearchUrl = "https://bing.com/search?q=" + encodeURIComponent(term);
    //  break;
    default:
      log("error", `Unknown engine supplied: ${engine}`);
      res.send(`{"error": "unknown engine supplied."}`)
      return;
  }

  log("debug", `Search engine URL: ${engineSearchUrl}`);

});

// https://www.30secondsofcode.org/js/s/color-console-output/

const logLevels = (...msg) => {
  const levels = {
    info: `\x1b[37m${msg.join(' ')}`,
    infoMarker: ` \x1b[30m\x1b[47m[INFO]\x1b[0m`,
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

  log("debug", `parsing with readability: ${url}`)
  
  let dom = await JSDOM.fromURL(url);
  let article = new Readability(dom.window.document).parse();

  if(!article || !article.textContent) {
    log("error", `failed to parse article "${url}".`)
    return;
  }

  log("info", `article "${url}" parsed`)
  
  // we consider div contents to be readable

  let readableDom = new JSDOM(article.content
    .replaceAll("\t"," ")
    .replaceAll("\n", " ")
    .replaceAll(/\s+/g, " ")
    .trim()
  )

  let readableDivs = readableDom.window.document.querySelectorAll('div');
  let readableDivContents = []
  for (div of readableDivs) {
    let divArticle = new Readability(
      new JSDOM(div.innerHTML).window.document
    ).parse();

    if (divArticle && divArticle.textContent) {
      readableDivContents.push(divArticle.textContent.slice(0,1000))
    }
  }

  return { 
    siteName: article.siteName,
    url: url,
    textContent: readableDivContents.join("\n").slice(0,4000) // TODO: a rough limit for content supplied 
  };
}

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log("\n");
  log("debug", `Server running at http://localhost:${port}/`); // Log server start info
});

