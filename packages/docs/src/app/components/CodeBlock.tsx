import { CopyButton } from './CopyButton';

interface CodeBlockProps {
  code: string;
  language?: string;
  title: string;
  className?: string;
}

export function CodeBlock({ code, language = 'tsx', title, className }: CodeBlockProps) {
  return (
    <div className={`code-panel ${className ?? ''}`} aria-label={`${title} code`}>
      <div className="panel-title">
        <span>{title}</span>
        <CopyButton text={code} />
      </div>
      <pre>
        <code>{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

function highlightCode(code: string, language: string) {
  const tokenPattern =
    language === 'bash'
      ? /(\b(?:pnpm|npm|yarn|add|install)\b|@[a-z0-9-]+\/[a-z0-9-]+)/gi
      : /(\b(?:import|from|function|const|return|async|await|export|new|if|let)\b|(['"`][^'"`]*['"`])|(\b\d+\b)|(\b[A-Z][A-Za-z0-9_]*\b))/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  code.replace(tokenPattern, (match, keyword, stringToken, numberToken, typeToken, offset) => {
    if (offset > lastIndex) {
      nodes.push(code.slice(lastIndex, offset));
    }

    const className = stringToken
      ? 'token-string'
      : numberToken
        ? 'token-number'
        : typeToken
          ? 'token-type'
          : 'token-keyword';

    nodes.push(
      <span className={className} key={`${match}-${offset}`}>
        {match}
      </span>
    );
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes;
}
