export default function Summary({ documentSummary, imageSummary }) {
  if (!documentSummary && !imageSummary) return null;

  const renderSummary = (summary, type) => {
    if (!summary) return null;

    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">
              {type === "document" ? "📄 Summary" : "🖼️ Analysis"}
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              {type === "document" ? "Key insights and main points" : "Text extraction and visual analysis"}
            </p>
          </div>
          <span className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider border ${
            type === "document" 
              ? "bg-blue-500/20 border-blue-400/30 text-blue-300"
              : "bg-purple-500/20 border-purple-400/30 text-purple-300"
          }`}>
            {type === "document" ? "Document" : "Image"}
          </span>
        </div>

        <div className="space-y-6">
          {typeof summary === "string" ? (
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-gray-200 leading-relaxed whitespace-pre-wrap text-sm">
              {summary}
            </div>
          ) : (
            <>
              <div>
                <h4 className="font-bold text-white mb-3 text-lg">Summary</h4>
                <p className="leading-relaxed text-gray-300 text-sm">{summary.summary}</p>
              </div>

              {summary.ocrText && (
                <div>
                  <h4 className="font-bold text-white mb-3">Extracted Text</h4>
                  <div className="p-4 bg-black/20 rounded-lg border border-white/10">
                    <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{summary.ocrText}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-white mb-2">File Information</h4>
                <p className="text-sm text-gray-400">
                  <span className="font-mono bg-white/10 px-3 py-1 rounded text-blue-300">{summary.filename}</span>
                  <span className="text-gray-500 ml-2">({summary.fileType})</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-6">
      {renderSummary(documentSummary, "document")}
      {renderSummary(imageSummary, "image")}
    </div>
  );
}