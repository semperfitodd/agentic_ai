export const MarkdownComponents = {
    h1: ({node, children, ...props}) => <h1 className="report-h1" {...props}>{children}</h1>,
    h2: ({node, children, ...props}) => <h2 className="report-h2" {...props}>{children}</h2>,
    h3: ({node, children, ...props}) => <h3 className="report-h3" {...props}>{children}</h3>,
    p: ({node, children, ...props}) => <p className="report-p" {...props}>{children}</p>,
    ul: ({node, children, ...props}) => <ul className="report-ul" {...props}>{children}</ul>,
    ol: ({node, children, ...props}) => <ol className="report-ol" {...props}>{children}</ol>,
    li: ({node, children, ...props}) => <li className="report-li" {...props}>{children}</li>,
    table: ({node, children, ...props}) => (
        <div className="table-wrapper">
            <table className="markdown-table" {...props}>{children}</table>
        </div>
    ),
    thead: ({node, children, ...props}) => <thead {...props}>{children}</thead>,
    tbody: ({node, children, ...props}) => <tbody {...props}>{children}</tbody>,
    tr: ({node, children, ...props}) => <tr {...props}>{children}</tr>,
    th: ({node, children, ...props}) => <th {...props}>{children}</th>,
    td: ({node, children, ...props}) => <td {...props}>{children}</td>,
    strong: ({node, children, ...props}) => <strong className="report-strong" {...props}>{children}</strong>,
    em: ({node, children, ...props}) => <em className="report-em" {...props}>{children}</em>,
    code: ({node, inline, children, ...props}) =>
        inline ? <code className="report-code-inline" {...props}>{children}</code> : <code {...props}>{children}</code>,
    pre: ({node, children, ...props}) => <pre className="report-pre" {...props}>{children}</pre>,
    a: ({node, children, ...props}) => <a className="report-link" target="_blank"
                                          rel="noopener noreferrer" {...props}>{children}</a>,
};

