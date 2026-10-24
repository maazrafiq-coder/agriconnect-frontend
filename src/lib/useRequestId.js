import { useRef } from 'react';
import { newRequestId } from './errors';

// One Idempotency-Key per submit INTENT. The same key is reused while the
// payload is unchanged (so a retry after a dropped connection can never create a
// second record) and a fresh key is issued as soon as the person changes what
// they are sending.
export default function useRequestId(signature) {
  const ref = useRef({ sig: null, id: null });
  return () => {
    if (ref.current.sig !== signature || !ref.current.id) ref.current = { sig: signature, id: newRequestId() };
    return ref.current.id;
  };
}
