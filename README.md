# A simple local search server

This repository contains a simple search server to support local search with the `mozilla/readability` library to parse webpages for readable information.

## API

### Inputs:

`POST /search`
```json
{
    "term": <your search term>,
    "engine": <only google is supported at the moment. feel free to add others locally or thru PRs>,
    "maxSearchResults": <the maximum number of search results to return. the actual number may be lower due to parsing failures>
}
```

### Outputs:

```json
{
    "siteName": <null or the name of the site>,
    "url": <the url of the current page>,
    "textContent": <content found in the divs throughout the page. a more refined version of Readability's article.textContent>
}
```

### TODOs

- [ ] Write tests
- [ ] Implement input and output sanitization
