/**
 * Simple markdown to HTML converter for chat messages
 */
export function formatMarkdown(markdown: string): string {
  return markdown
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-surface p-3 rounded-lg my-3 overflow-x-auto"><code class="text-xs">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-surface px-1.5 py-0.5 rounded text-accent text-sm">$1</code>')
    // Headers
    .replace(/^#### (.*$)/gm, '<h4 class="text-sm font-semibold mt-4 mb-2 text-foreground">$1</h4>')
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-5 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-6 mb-3 text-foreground">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-muted">$1</li>')
    // Ordered lists
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-muted">$2</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="my-3 text-muted leading-relaxed">')
    // Single line breaks
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph
    .replace(/^/, '<p class="my-3 text-muted leading-relaxed">')
    .replace(/$/, '</p>')
    // Clean up empty paragraphs
    .replace(/<p class="[^"]*"><\/p>/g, '')
}
