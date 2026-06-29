'use client';

import clipboard from 'clipboard-js';
import { useCallback, useState } from 'react';
import { FaCheck, FaCopy } from 'react-icons/fa';

interface CopyButtonParams {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CopyButton({ text, className, style }: CopyButtonParams) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await clipboard.copy(text);
      setCopied(true);
    } catch (error) {
      console.error('Failed to copy code:', error);
    } finally {
      const timer = setTimeout(() => {
        setCopied(false);
        clearTimeout(timer);
      }, 2000);
    }
  }, [text]);

  return (
    <div className={className} style={style}>
      <button onClick={handleCopy} className="copy-btn" title="复制代码">
        {copied ? (
          <FaCheck className="copy-btn-icon copy-btn-check" />
        ) : (
          <FaCopy className="copy-btn-icon" />
        )}
      </button>
    </div>
  );
}
