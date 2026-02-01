'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { cn } from '@/shared/lib/utils'

const proseClass = cn(
  'prose prose-sm max-w-none text-foreground',
  'prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-headings:first:mt-0',
  'prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-2 prose-p:first:mt-0',
  'prose-strong:text-foreground prose-strong:font-semibold',
  'prose-ul:my-3 prose-ol:my-3 prose-li:text-foreground/90 prose-li:my-1',
  'prose-pre:my-3 prose-pre:bg-surface-inset prose-pre:border prose-pre:border-border/10 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:p-4',
  'prose-code:text-primary prose-code:bg-surface-inset prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:border prose-code:border-border/10',
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-hr:border-border/20 prose-hr:my-4',
  'prose-table:my-4 prose-thead:border-b prose-thead:border-border/20 prose-th:py-2 prose-th:px-3 prose-th:text-left prose-th:font-semibold prose-th:text-foreground',
  'prose-tbody:divide-y prose-tbody:divide-border/10 prose-td:py-2 prose-td:px-3 prose-td:text-foreground/90',
  '[&_table]:w-full [&_table]:min-w-0 [&_table]:block [&_table]:overflow-x-auto',
  '[&_tbody_tr:nth-child(even)]:bg-white/5'
)

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Renders markdown with GFM (tables, strikethrough, autolinks) and sanitized HTML.
 * Replaces formatMarkdown + dangerouslySetInnerHTML for XSS safety and table support.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null
  return (
    <div className={cn(proseClass, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
