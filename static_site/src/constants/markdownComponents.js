const createComponent = (tag, className) => ({node, children, ...props}) => {
  const Component = tag;
  return <Component className={className} {...props}>{children}</Component>;
};

export const MarkdownComponents = {
  h1: createComponent('h1', 'report-h1'),
  h2: createComponent('h2', 'report-h2'),
  h3: createComponent('h3', 'report-h3'),
  p: createComponent('p', 'report-p'),
  ul: createComponent('ul', 'report-ul'),
  ol: createComponent('ol', 'report-ol'),
  li: createComponent('li', 'report-li'),
  strong: createComponent('strong', 'report-strong'),
  em: createComponent('em', 'report-em'),
  pre: createComponent('pre', 'report-pre'),
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
  code: ({node, inline, children, ...props}) =>
    inline ? <code className="report-code-inline" {...props}>{children}</code> : <code {...props}>{children}</code>,
  a: ({node, children, ...props}) => (
    <a className="report-link" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  ),
};
