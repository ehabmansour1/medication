"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
};

type Props = { url: string };

export default function PdfViewer({ url }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(800);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function update() {
      const padding = 40;
      setWidth(Math.min(window.innerWidth - padding, 900));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="pdf-scroll" onClick={(e) => e.stopPropagation()}>
      <Document
        file={url}
        options={PDF_OPTIONS}
        loading={<p className="pdf-message">Loading PDF…</p>}
        error={<p className="pdf-message error">Failed to load PDF.</p>}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setError(null);
        }}
        onLoadError={(e) => setError(e.message)}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i + 1}
            pageNumber={i + 1}
            width={width}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        ))}
      </Document>
      {error && <p className="pdf-message error">{error}</p>}
    </div>
  );
}
