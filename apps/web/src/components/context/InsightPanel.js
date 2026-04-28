import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function formatMemoryDate(value) {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
export function InsightPanel({ attachments, memoryStatus, memoryBank, isLoadingMemory, memoryError, lastHistoryRefreshAt, onRefreshMemory }) {
    const memoryUnavailable = memoryStatus && (!memoryStatus.enabled || !memoryStatus.reachable || memoryStatus.authFailed);
    return (_jsxs("aside", { className: "context-panel panel", children: [_jsxs("section", { className: "context-section", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "File context" }), _jsxs("span", { className: "muted", children: [attachments.length, " linked"] })] }), attachments.length === 0 ? (_jsxs("div", { className: "empty-card", children: [_jsx("p", { children: "No uploaded context yet." }), _jsx("span", { children: "Add a document, screenshot, or audio file to generate helpful summaries and extract key details." })] })) : (attachments.map((attachment) => (_jsxs("article", { className: "artifact-card", children: [_jsxs("div", { className: "artifact-header", children: [_jsx("strong", { children: attachment.name }), _jsx("span", { children: attachment.kind })] }), _jsx("p", { children: attachment.insight?.summary ?? "Processing complete." }), attachment.insight?.decisions?.length ? _jsxs("small", { children: ["Decisions: ", attachment.insight.decisions.join(" | ")] }) : null, attachment.insight?.actionItems?.length ? _jsxs("small", { children: ["Actions: ", attachment.insight.actionItems.join(" | ")] }) : null, attachment.insight?.risks?.length ? _jsxs("small", { children: ["Risks: ", attachment.insight.risks.join(" | ")] }) : null] }, attachment.id))))] }), _jsxs("section", { className: "context-section", children: [_jsxs("div", { className: "panel-header", children: [_jsxs("div", { children: [_jsx("h2", { children: "History" }), _jsx("span", { className: "muted", children: isLoadingMemory
                                    ? "Refreshing stored history for this account or guest session."
                                    : lastHistoryRefreshAt
                                        ? `Last updated ${formatMemoryDate(lastHistoryRefreshAt) ?? "just now"}.`
                                        : "Stored history for this account or guest session." })] }), _jsx("button", { className: "button panel-inline-button", type: "button", disabled: isLoadingMemory, onClick: onRefreshMemory, children: isLoadingMemory ? "Refreshing..." : "Refresh history" })] }), memoryStatus ? (_jsxs("div", { className: "memory-status-row", children: [_jsx("span", { className: memoryStatus.enabled && memoryStatus.reachable && !memoryStatus.authFailed
                                    ? "status-badge status-authenticated"
                                    : memoryStatus.enabled
                                        ? "status-badge status-guest"
                                        : "status-badge status-neutral", children: memoryStatus.enabled && memoryStatus.reachable
                                    ? memoryStatus.authFailed
                                        ? "Hindsight auth failed"
                                        : "Hindsight connected"
                                    : memoryStatus.enabled
                                        ? "Hindsight unavailable"
                                        : "Hindsight off" }), _jsx("span", { className: "mini-glass-tag", children: memoryBank?.bankId ?? "No active history yet" })] })) : null, memoryError ? (_jsxs("div", { className: "empty-card", children: [_jsx("p", { children: "History could not be loaded." }), _jsx("span", { children: memoryError })] })) : isLoadingMemory && !memoryBank ? (_jsxs("div", { className: "empty-card", children: [_jsx("p", { children: "Loading history." }), _jsx("span", { children: "Checking status and fetching recent retained items." })] })) : memoryUnavailable ? (_jsxs("div", { className: "empty-card", children: [_jsx("p", { children: "History is not currently available." }), _jsx("span", { children: memoryStatus?.reason ?? "The Hindsight backend could not be reached from the API." })] })) : !memoryBank || memoryBank.items.length === 0 ? (_jsxs("div", { className: "empty-card", children: [_jsx("p", { children: "No history is visible yet." }), _jsx("span", { children: "Send a few messages and refresh after a short delay. Retention runs in the background." })] })) : (_jsx("div", { className: "memory-bank-list", children: memoryBank.items.map((memory) => (_jsxs("article", { className: "memory-entry", children: [_jsxs("div", { className: "memory-entry-header", children: [_jsx("strong", { children: memory.summary }), _jsx("span", { children: formatMemoryDate(memory.timestamp ?? memory.createdAt) ?? "Stored" })] }), _jsx("p", { children: memory.content }), _jsxs("div", { className: "memory-entry-meta", children: [memory.kind ? _jsxs("small", { children: ["Type: ", memory.kind] }) : null, memory.sourceChatId ? _jsxs("small", { children: ["Chat: ", memory.sourceChatId] }) : null, memory.source ? _jsxs("small", { children: ["Source: ", memory.source] }) : null] }), memory.tags.length > 0 ? (_jsx("div", { className: "memory-tag-row", "aria-label": "Memory tags", children: memory.tags.map((tag) => (_jsx("span", { className: "memory-tag", children: tag }, `${memory.id}-${tag}`))) })) : null] }, memory.id))) }))] })] }));
}
