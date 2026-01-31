/**
 * Markdown to HTML converter
 * Handles both pure markdown and HTML-mixed content from Python FastAPI
 */
export function formatMarkdown(markdown: string): string {
  if (!markdown) return ''
  
  let html = markdown
  
  // Step 1: HTML 태그 정리 및 변환
  // <p> 태그의 클래스만 업데이트 (내용 유지)
  html = html.replace(/<p[^>]*class="[^"]*"[^>]*>/gi, '<p class="my-3 text-muted leading-relaxed">')
  html = html.replace(/<p[^>]*>/gi, '<p class="my-3 text-muted leading-relaxed">')
  
  // <h4> 태그 스타일 통일
  html = html.replace(/<h4[^>]*class="[^"]*"[^>]*>/gi, '<h4 class="text-sm font-semibold mt-6 mb-3 text-foreground">')
  html = html.replace(/<h4[^>]*>/gi, '<h4 class="text-sm font-semibold mt-6 mb-3 text-foreground">')
  
  // <li> 태그 스타일 통일
  html = html.replace(/<li[^>]*class="[^"]*"[^>]*>/gi, (match) => {
    if (match.includes('list-decimal')) {
      return '<li class="ml-4 list-decimal text-muted my-1">'
    }
    return '<li class="ml-4 list-disc text-muted my-1">'
  })
  html = html.replace(/<li[^>]*>/gi, '<li class="ml-4 list-disc text-muted my-1">')
  
  // <strong> 태그 스타일 통일
  html = html.replace(/<strong[^>]*class="[^"]*"[^>]*>/gi, '<strong class="font-semibold text-foreground">')
  html = html.replace(/<strong[^>]*>/gi, '<strong class="font-semibold text-foreground">')
  
  // <br/> 정리
  html = html.replace(/<br\s*\/?>/gi, '<br/>')
  
  // Step 2: 리스트를 <ul> 또는 <ol>로 감싸기
  // 연속된 <li> 태그를 찾아서 감싸기
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/g, (match) => {
    const isOrdered = match.includes('list-decimal')
    const listTag = isOrdered ? 'ol' : 'ul'
    const listClass = isOrdered ? 'my-3 space-y-1 list-decimal' : 'my-3 space-y-1 list-disc'
    return `<${listTag} class="${listClass}">${match}</${listTag}>`
  })
  
  // Step 3: 순수 마크다운 처리 (HTML이 아닌 경우)
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-surface-inset p-3 rounded-lg my-3 overflow-x-auto border border-border/10"><code class="text-xs text-foreground">$2</code></pre>')
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-surface-inset px-1.5 py-0.5 rounded text-primary text-sm border border-border/10">$1</code>')
  
  // Headers (마크다운 형식)
  html = html.replace(/^#### (.*$)/gm, '<h4 class="text-sm font-semibold mt-6 mb-3 text-foreground">$1</h4>')
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-6 mb-3 text-foreground">$1</h3>')
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-6 mb-3 text-foreground">$1</h2>')
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>')
  
  // Bold (마크다운 형식)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  
  // Links (마크다운 형식)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>')
  
  // Step 4: 빈 paragraph 제거
  html = html.replace(/<p[^>]*>\s*<\/p>/gi, '')
  html = html.replace(/<p[^>]*><br\/><\/p>/gi, '')
  
  // Step 5: HTML 엔티티 디코딩
  html = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  return html
}
