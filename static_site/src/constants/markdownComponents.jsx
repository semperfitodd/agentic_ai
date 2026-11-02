import { Children, isValidElement } from 'react';
import { slugify } from '../utils/reportSummary';

const textOf = (children) =>
    Children.toArray(children)
        .map((child) => (typeof child === 'string' ? child : isValidElement(child) ? textOf(child.props.children) : ''))
        .join('');

const isExternal = (href = '') => /^https?:\/\//.test(href);

export const MarkdownComponents = {
    h1: ({ node, children, ...props }) => <h2 {...props}>{children}</h2>,
    h2: ({ node, children, ...props }) => (
        <h2 id={slugify(textOf(children))} {...props}>
            {children}
        </h2>
    ),
    table: ({ node, children, ...props }) => (
        <div className="table-wrap" role="region" aria-label="Table" tabIndex={0}>
            <table {...props}>{children}</table>
        </div>
    ),
    a: ({ node, children, href, ...props }) => (
        <a href={href} {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...props}>
            {children}
        </a>
    ),
};
