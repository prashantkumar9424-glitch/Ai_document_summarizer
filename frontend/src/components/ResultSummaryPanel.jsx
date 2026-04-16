function ResultCard({ title, chip, body, excerptLabel, excerpt, details }) {
  return (
    <article className="summary-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{chip}</p>
          <h3 className="panel-title">{title}</h3>
        </div>
        <span className="status-chip">Ready</span>
      </div>

      <div className="summary-body">
        <div className="rich-output">{body}</div>

        {excerpt && (
          <div className="detail-block">
            <h4>{excerptLabel}</h4>
            {excerptLabel === "Extracted text" ? (
              <pre className="mono-block">{excerpt}</pre>
            ) : (
              <p>{excerpt}</p>
            )}
          </div>
        )}

        <div className="detail-grid">
          {details.map((detail) => (
            <div key={detail.label}>
              <span className="detail-label">{detail.label}</span>
              <p>{detail.value}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function ResultSummaryPanel({ documentSummary, imageSummary }) {
  if (!documentSummary && !imageSummary) {
    return null;
  }

  return (
    <section className="summary-stack">
      {documentSummary && (
        <ResultCard
          title={documentSummary.filename || "Latest document"}
          chip="Document Result"
          body={documentSummary.summary}
          excerptLabel="Document excerpt"
          excerpt={documentSummary.excerpt}
          details={[
            { label: "File type", value: documentSummary.fileType || "Unknown" },
            { label: "Source", value: documentSummary.filename || "Uploaded document" }
          ]}
        />
      )}

      {imageSummary && (
        <ResultCard
          title={imageSummary.filename || "Latest image"}
          chip="Image Result"
          body={imageSummary.summary}
          excerptLabel="Extracted text"
          excerpt={imageSummary.ocrText}
          details={[
            { label: "File type", value: imageSummary.fileType || "Unknown" },
            { label: "Mode", value: imageSummary.analysisMode || "Analysis" }
          ]}
        />
      )}
    </section>
  );
}
