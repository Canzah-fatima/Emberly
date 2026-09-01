import { useEffect, useRef } from 'react';
import gsap from 'gsap';

// A quiet field of drifting ember used as ambient atmosphere on auth screens.
// Deliberately restrained: low opacity, slow, respects reduced-motion.
export default function EmberField({ count = 16 }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container = containerRef.current;
    if (!container) return;

    const particles = [];
    const colors = ['#C11720', '#98A19B', '#C11720'];

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      const size = gsap.utils.random(2, 6);
      el.style.position = 'absolute';
      el.style.left = `${gsap.utils.random(0, 100)}%`;
      el.style.bottom = `-10px`;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.background = colors[i % colors.length];
      el.style.filter = 'blur(0.5px)';
      el.style.opacity = '0';
      el.style.boxShadow = `0 0 ${size * 2}px ${colors[i % colors.length]}`;
      container.appendChild(el);
      particles.push(el);
    }

    const tweens = particles.map((el) => {
      if (prefersReduced) {
        gsap.set(el, { opacity: 0.15 });
        return null;
      }
      return gsap.to(el, {
        y: () => -gsap.utils.random(300, 700),
        x: () => gsap.utils.random(-40, 40),
        opacity: () => gsap.utils.random(0.25, 0.6),
        duration: () => gsap.utils.random(6, 13),
        delay: () => gsap.utils.random(0, 8),
        repeat: -1,
        ease: 'sine.inOut',
        onRepeat: () => {
          gsap.set(el, { y: 0, x: 0, left: `${gsap.utils.random(0, 100)}%` });
        },
      });
    });

    return () => {
      tweens.forEach((t) => t && t.kill());
      particles.forEach((el) => el.remove());
    };
  }, [count]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}
