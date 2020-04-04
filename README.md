# PDF.JS range request viewer demo

This projects aims to demo usage of PDF.JS lib to display a pdf while loading the only neccessary chunks to display current page.

## Why ?

Having a back end supporting range requests, I wanted to try saving unnecessary large downloads and provide a clever pdf reader that only fetches the necessary data.

pdf.js currently lacks documentation regarding range request support and usage and I had to dig into various github issues and pdf.js code base to make it works on cors requests.

pdf.js always start to fetch the doument using a classic get request requesting the whole document in its default behavior, request which is then cancelled. As I own the back end and implemented http range requests, I wanted to avoid that initial get request and replace it with a traditional head request following classical range request implementation.

## How ?

pdf.js has great support of range request, it even support them by default when you just pass it an url by checking retrieved headers.

In order to customise the way pdf.js manage range download, the library provide the ability to describe the range download mechanism thanks to a `PDFDataRangeTransport` abstract class.

Then in order to implement HTTP range requests with `PDFDataRangeTransport` you need :

 - Your backend to autorize reads of `Content-Length` header in case of cors requests thanks to `Access-Control-Expose-Headers` header returned as part of preflight request
 - The following implementation :

```js

// perform head request in order to retrieve full pdf length
fetch(url, {
      method: 'head',
      headers: {
        accept: 'application/pdf'
      }
    }).then(headResponse => {
      const contentLength = parseInt(headResponse.headers.get('Content-Length') || '0');
      let fetchedData = 0;
      if (contentLength === 0) throw new Error("Content Length is 0");

      // initiate a PDFDataRangeTransport by providing the full length of the pdf file
      const pdfRangeTransport = new PDFDataRangeTransport(contentLength, new Uint8Array());
      pdfRangeTransport.requestDataRange = (begin: number, end: number) => {
        // request the expected range using `range` header
        fetch(url, {
            method: 'get',
            headers: {
            range: `bytes=${begin}-${end - 1}`,
            accept: 'application/pdf'
            }
        }).then(async (rangeResponse) => {
          if (rangeResponse.ok) {
            const rangeLength = parseInt(rangeResponse.headers.get('Content-Length') || '0');
            fetchedData += rangeLength;
            pdfRangeTransport.onDataProgress(fetchedData, contentLength);// report load progress to eventual listeners
            pdfRangeTransport.onDataRange(begin, await rangeResponse.arrayBuffer());// append the retrieved chunk of data
          }
        });
      }

      pdfRangeTransport.addProgressListener(console.log);// watch loading progress

      getDocument({// get the pdf document
        range: pdfRangeTransport,
        length: contentLength
      })
    });
```