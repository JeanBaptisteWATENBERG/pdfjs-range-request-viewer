import React, { useState, ChangeEvent } from "react";
import PDFRangeRequestViewer from "./PDFRangeRequestViewer";

export default function App() {
    const [url, setUrl] = useState('https://cors-anywhere.herokuapp.com/https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf');
    return <>
        PDF Url <input type='text' value={url} onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} style={{width: '100%'}} /><br /><br />
        <PDFRangeRequestViewer url={url} />
    </>;
}