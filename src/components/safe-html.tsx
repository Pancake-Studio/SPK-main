import sanitize from "sanitize-html";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const sanitized = sanitize(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "strike",
      "a",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "pre",
      "code",
      "span",
      "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
