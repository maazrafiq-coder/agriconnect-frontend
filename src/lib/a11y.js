// Props that make a non-<button> element operable by keyboard and assistive tech:
// spread them onto the element in place of a bare `onClick`.
//   <div {...clickable(() => open(id))}>…</div>
// Prefer a real <button> or <a> when the markup allows; this is for rows, cards and
// custom controls whose layout can't change.
export function clickable(onClick, role = 'button') {
  return {
    onClick,
    role,
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return; // don't hijack keys from nested inputs/buttons
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}
