import React, { useState } from "react";

const PrintExample = () => {
  const [showIframe, setShowIframe] = useState(false);

  const handlePrint = () => {
    // setShowIframe(true);

    const iframe = document.getElementById("printFrame");
    if (!iframe) return;

    iframe.src = "/pdf-static/print_template.html"; // Path to your static HTML file

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
  };

  return (
    <div>
      <button
        onClick={handlePrint}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Print Sample Document
      </button>

      {/* Hidden container for iframe */}
      <div
        style={{
          display: showIframe ? "block" : "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "white",
          zIndex: 9999,
        }}
      >
        <iframe
          id="printFrame"
          title="Print Preview"
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
};

export default PrintExample;
