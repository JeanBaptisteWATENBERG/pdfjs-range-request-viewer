import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getDocument, PDFDataRangeTransport, PDFDocumentProxy, PDFProgressData, PDFPageProxy } from 'pdfjs-dist/webpack';

const fetchRange = (url: string, begin: number, end: number) => {
  return fetch(url, {
    method: 'get',
    headers: {
      range: `bytes=${begin}-${end}`,
      accept: 'application/pdf'
    }
  })
}

function PDFRangeRequestViewer({url}: {url: string}) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [pdfLoadingProgress, setPdfLoadingProgress] = useState<PDFProgressData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const progressCallback = useCallback((loaded: number, total: number) => {
    setPdfLoadingProgress({ loaded, total });
  }, [pdfLoadingProgress])

  useEffect(() => {
    let isMounted = true;
    setPage(1);
    fetch(url, {
      method: 'head',
      headers: {
        accept: 'application/pdf'
      }
    }).then(headResponse => {
      const contentLength = parseInt(headResponse.headers.get('Content-Length') || '0');
      let fetchedData = 0;
      if (contentLength === 0) throw new Error("Content Length is 0");

      const pdfRangeTransport = new PDFDataRangeTransport(contentLength, new Uint8Array());
      pdfRangeTransport.requestDataRange = (begin: number, end: number) => {
        fetchRange(url, begin, end - 1).then(async (rangeResponse) => {
          if (rangeResponse.ok) {
            const rangeLength = parseInt(rangeResponse.headers.get('Content-Length') || '0');
            fetchedData += rangeLength;
            pdfRangeTransport.onDataProgress(fetchedData, contentLength);
            pdfRangeTransport.onDataRange(begin, await rangeResponse.arrayBuffer());
          }
        });
      }

      pdfRangeTransport.addProgressListener(progressCallback)
      getDocument({
        range: pdfRangeTransport,
        length: contentLength
      }).promise
        .then((pdfDocument: PDFDocumentProxy) => {
          if (!isMounted) return;
          setPdfDocument(pdfDocument);
        });
    })
    return () => {
      isMounted = false;
    }
  }, [url])

  useEffect(() => {
    if (!pdfDocument) return;
    pdfDocument.getPage(page).then((pdfPage: PDFPageProxy) => {
      const viewport = pdfPage.getViewport({ scale: 1.0 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const renderTask = pdfPage.render({
        canvasContext: ctx,
        viewport: viewport,
      });
      return renderTask.promise;
    });
  }, [pdfDocument, page, canvasRef])

  return (
    <div style={{background: '#ccc', paddingBottom: '10px'}}>
      {pdfDocument && <div style={{background: "#222", color: 'white', padding: '15px 35px', marginBottom: '10px'}}>
        Pages : {page} / {pdfDocument.numPages} Downloaded bytes : {pdfLoadingProgress && `${pdfLoadingProgress.loaded} / ${pdfLoadingProgress.total} (${(pdfLoadingProgress.loaded / pdfLoadingProgress.total * 100).toFixed(2)} %)`}
        <div style={{ float: 'right' }}>
          <button disabled={page - 1 <= 0} onClick={() => setPage(page - 1)}>Prev page</button>
          <button disabled={page + 1 > pdfDocument.numPages} onClick={() => setPage(page + 1)}>Next page</button>
        </div>
      </div>}
      <canvas style={{margin: '0 auto', display: 'block', boxShadow: '0 0 2px 1px #777'}} ref={canvasRef}></canvas>
    </div>
  );
}

export default PDFRangeRequestViewer;