'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const SHOW_AFTER_MS = 2500;
const HIDE_AFTER_SCROLL_PX = 60;

export default function ScrollHint() {
  const [visible, setVisible] = useState(false);
  const [hiddenByScroll, setHiddenByScroll] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      setVisible(true);
    }, SHOW_AFTER_MS);

    const onScroll = () => {
      if (window.scrollY > HIDE_AFTER_SCROLL_PX) {
        setHiddenByScroll(true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const show = visible && !hiddenByScroll;

  return (
    <div
      className="scroll-hint"
      aria-hidden
      data-visible={show}
    >
      <span className="scroll-hint-icon">
        <ChevronDown size={28} strokeWidth={2} />
      </span>
    </div>
  );
}
