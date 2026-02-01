const P_CLASS = 'my-3 text-foreground/90 leading-relaxed'
const LIST_UL_CLASS = 'my-3 space-y-1.5 list-disc pl-5'
const LIST_OL_CLASS = 'my-3 space-y-1.5 list-decimal pl-5'
const LI_CLASS = 'my-1'

/**
 * Markdown to HTML converter
 * ChatGPT/Claude 스타일: 단락·헤딩·리스트·코드블록 구분 명확
 */
export function formatMarkdown(markdown: string): string {
  if (!markdown) return ''

  let html = markdown
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // 1) 코드블록 보호 (먼저 치환)
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, _lang, code) => {
    const i = codeBlocks.length
    const escaped = String(code).replace(/</g, '&lt;').replace(/>/g, '&gt;')
    codeBlocks.push(`<pre class="bg-surface-inset p-4 rounded-xl my-4 overflow-x-auto border border-border/10 text-sm text-foreground"><code>${escaped}</code></pre>`)
    return `\u0000CODE${i}\u0000`
  })
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-surface-inset px-1.5 py-0.5 rounded text-primary text-sm border border-border/10">$1</code>')

  // 2) 헤딩 (마크다운)
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="text-sm font-semibold mt-5 mb-2 text-foreground">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="text-base font-semibold mt-5 mb-2 text-foreground">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-xl font-bold mt-5 mb-2 text-foreground">$1</h1>')

  // 3) 마크다운 리스트: - / * / 1. 로 시작하는 연속 줄을 ul/ol로
  html = html.replace(/(^(?:[-*]\s+.+)(?:\n(?:[-*]\s+.+))*)/gm, (block) => {
    const items = block.trim().split(/\n/).map((line) => line.replace(/^[-*]\s+/, ''))
    const lis = items.map((t) => `<li class="${LI_CLASS}">${t}</li>`).join('\n')
    return `<ul class="${LIST_UL_CLASS}">${lis}</ul>`
  })
  html = html.replace(/(^(?:\d+\.\s+.+)(?:\n(?:\d+\.\s+.+))*)/gm, (block) => {
    const items = block.trim().split(/\n/).map((line) => line.replace(/^\d+\.\s+/, ''))
    const lis = items.map((t) => `<li class="${LI_CLASS}">${t}</li>`).join('\n')
    return `<ol class="${LIST_OL_CLASS}">${lis}</ol>`
  })

  // 4) 볼드/이탤릭/링크
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener">$1</a>')

  // 5) 단락: 빈 줄(\n\n)로 구분된 블록을 <p>로 감싸기 (이미 태그인 블록 제외)
  const rawBlocks = html.split(/\n\n+/)
  const blocks = rawBlocks.map((block) => {
    const text = block.trim()
    if (!text) return ''
    if (/^<(h[1-4]|ul|ol|pre)/i.test(text)) return text
    const withBr = text.replace(/\n/g, '<br/>')
    return `<p class="${P_CLASS}">${withBr}</p>`
  }).filter(Boolean)
  html = blocks.join('\n')

  // 6) 코드블록 복원
  codeBlocks.forEach((replacement, i) => {
    html = html.replace(`\u0000CODE${i}\u0000`, replacement)
  })

  // 7) 기존 HTML 태그 정리
  html = html.replace(/<p[^>]*>/gi, `<p class="${P_CLASS}">`)
  html = html.replace(/<h4[^>]*>/gi, '<h4 class="text-sm font-semibold mt-5 mb-2 text-foreground">')
  html = html.replace(/<li[^>]*>/gi, `<li class="${LI_CLASS}">`)
  html = html.replace(/<br\s*\/?>/gi, '<br/>')
  html = html.replace(/<p[^>]*>\s*<\/p>/gi, '')
  html = html.replace(/<p[^>]*><br\/><\/p>/gi, '')

  return html
}
