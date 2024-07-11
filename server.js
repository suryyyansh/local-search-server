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

// Define a route handler for the root URL
app.post('/search', (req, res) => {
  const body = req.body
  const term = body.term;
  const engine = body.engine;
  const max_search_results = body.maxSearchResults ? body.maxSearchResults : 5;
  var engine_search_url;

  switch(engine) {
    case "google":
      engine_search_url = "https://google.com/search?q=" + encodeURIComponent(term);
      break;
    case "bing":
      engine_search_url = "https://bing.com/search?q=" + encodeURIComponent(term);
      break;
  }

  console.log('searching: ' + engine_search_url);

  var get_follow_redirects = (url) => {
    console.log("reached 1")
    https.get(url, (httpsRes) => {

      if(httpsRes.statusCode >= 300 && httpsRes.statusCode < 400) {
        console.log("following redirect");
        get_follow_redirects(httpsRes.headers.location);
      } else {
        console.log("reached 2")
        let data = '';

        // a chunk of data has been received.
        httpsRes.on('data', (chunk) => {
          data += chunk;
        });
        // the whole response has been received. print out the result.
        httpsRes.on('end', () => {
          var doc = new JSDOM(data, {
            url: url
          });

          let clonedDoc = doc.window.document.cloneNode(true);
          let reader = new Readability(clonedDoc);
          let article = reader.parse();

          console.log("article output: ");
          console.log(article);

          var result_urls = doc.window.document.getElementsByTagName('h3');
          for (x of result_urls) {
            console.log("element: " + x.textContent);
            console.log("elementparent: " + x.parentNode.innerText);
            console.log("\n")
          }
        });
      }
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
      //return "FAILED TO ACCESS SEARCH ENGINE";
    });
  }
  get_follow_redirects(engine_search_url);
  res.send("query excecuted\n");
return;

  https.get(engine_search_url, (httpsRes) => {
    let data = '';
    // a chunk of data has been received.
    httpsRes.on('data', (chunk) => {
      data += chunk;
    });
    // the whole response has been received. print out the result.
    httpsRes.on('end', () => {
      var doc = new JSDOM(data, {
        url: url
      });

      let reader = new Readability(doc.window.document);
      let article = reader.parse();

      console.log("article output: ");
      console.log(article);
      res.send(JSON.stringify(article));
    });

  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
    return "FAILED TO GET ARTICLE";
  });
  
});

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`); // Log server start info
});

